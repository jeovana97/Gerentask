import React, { createContext, useContext, useState, useEffect } from 'react';
import { getDBData, api } from '../services/db';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  const { user } = useAuth();
  const [allTasks, setAllTasks] = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  
  const [tasks, setTasks] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  const [users, setUsers] = useState([]);
  const [history, setHistory] = useState([]);
  const [updateHistory, setUpdateHistory] = useState([]);
  const [insertionHistory, setInsertionHistory] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [settings, setSettings] = useState({});
  const [focusedTaskId, setFocusedTaskId] = useState(null);

  // Carrega os dados na inicialização
  useEffect(() => {
    reloadData();
  }, [user]); // Atualiza se o usuário logar/deslogar para sincronizar dados

  const reloadData = async () => {
    const fetchedTasks = await getDBData('gt_tasks', true);
    const fetchedDepartments = await getDBData('gt_departments', true);
    const fetchedJobTitles = await getDBData('gt_jobTitles', true);
    const fetchedUsers = await getDBData('gt_users', true);
    
    setAllDepartments(fetchedDepartments);
    setAllUsers(fetchedUsers);
    
    // Migração em tempo real: garante que toda tarefa tem assignedToIds
    const tasksWithArrays = fetchedTasks.map(t => {
      if (t.assignedToIds === undefined) {
        return { ...t, assignedToIds: t.assignedToId ? [t.assignedToId] : [] };
      }
      return t;
    });

    setAllTasks(tasksWithArrays);
    setTasks(tasksWithArrays.filter(t => !t.deletedAt));
    setDepartments(fetchedDepartments.filter(d => !d.deletedAt));
    setJobTitles(fetchedJobTitles.filter(j => !j.deletedAt));
    setUsers(fetchedUsers.filter(u => !u.deletedAt));
    
    
    fetchHistory();
    fetchNotifications();
    fetchSettings();
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      const settingsObj = {};
      res.forEach(item => {
        try {
          settingsObj[item.key] = JSON.parse(item.value);
        } catch (e) {
          settingsObj[item.key] = item.value;
        }
      });
      setSettings(settingsObj);
    } catch (err) {
      console.error(err);
    }
  };

  const updateSetting = async (key, value) => {
    try {
      await api.put(`/settings/${key}`, { value });
      await fetchSettings();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res);
    } catch (err) {
      console.error(err);
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      await fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const dispatchNotification = async (title, message, taskId, userIds, priority = false) => {
    if (!userIds || userIds.length === 0) return;
    try {
      await api.post('/notifications', { title, message, taskId, userIds, priority });
      await fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get('/history');
      setHistory(res);
      const resUpdates = await api.get('/update-history');
      setUpdateHistory(resUpdates);
      const resInsertions = await api.get('/insertion-history');
      setInsertionHistory(resInsertions);
    } catch (err) {
      console.error(err);
    }
  };

  // --- TAREFAS ---
  const addTask = async (taskData) => {
    // Se o criador for o gerente do departamento destino da tarefa, ela já é criada aprovada
    const isManagerOfDept = user && ['manager', 'master'].includes(user.role) && user.departmentId === taskData.departmentId;
    const approvalStatus = taskData.isPersonal ? 'approved' : (isManagerOfDept ? 'approved' : 'pending');

    const newTask = {
      id: 't_' + Date.now(),
      createdAt: new Date().toISOString(),
      comments: [],
      createdById: user ? user.id : '',
      createdBy: user ? user.name : 'Sistema',
      approvalStatus,
      ...taskData
    };
    
    await api.post('/tasks', newTask);
    await reloadData();
    
    // Notifica os usuários atribuídos (exceto o próprio criador, se ele se atribuiu)
    const usersToNotify = newTask.assignedToIds ? newTask.assignedToIds.filter(id => id !== user?.id) : [];
    
    // Se a tarefa precisa de aprovação, notifica o(s) gerente(s) do departamento do criador da tarefa
    if (newTask.approvalStatus === 'pending') {
      const managerIds = users
        .filter(u => ['manager', 'master'].includes(u.role) && u.departmentId === user?.departmentId)
        .map(u => u.id);
        
      managerIds.forEach(mId => {
        if (!usersToNotify.includes(mId) && mId !== user?.id) {
          usersToNotify.push(mId);
        }
      });
    }

    const notificationTitle = newTask.approvalStatus === 'pending' ? 'Tarefa Pendente de Aprovação' : 'Nova Tarefa';
    const notificationMessage = newTask.approvalStatus === 'pending' 
      ? `A tarefa "${newTask.title}" precisa da sua aprovação.` 
      : `A tarefa "${newTask.title}" foi atribuída a você.`;

    await dispatchNotification(
      notificationTitle,
      notificationMessage,
      newTask.id,
      usersToNotify
    );
    
    return newTask;
  };

  const updateTask = async (taskId, updatedData) => {
    const oldTask = tasks.find(t => t.id === taskId);
    await api.put(`/tasks/${taskId}?changedBy=${encodeURIComponent(user?.name || 'Sistema')}`, updatedData);
    await reloadData();

    if (oldTask && user) {
      const usersToNotify = (oldTask.assignedToIds || []).filter(id => id !== user.id);
      
      let title = 'Tarefa Atualizada';
      let message = `A tarefa "${oldTask.title}" foi modificada.`;
      
      if (updatedData.status && updatedData.status !== oldTask.status) {
        title = 'Mudança de Status';
        const stMap = { 'todo': 'A Fazer', 'doing': 'Em Andamento', 'done': 'Concluído' };
        message = `A tarefa "${oldTask.title}" foi movida para ${stMap[updatedData.status]}.`;
      } else if (updatedData.approvalStatus === 'approved' && oldTask.approvalStatus === 'pending') {
        title = 'Tarefa Aprovada';
        message = `Sua solicitação "${oldTask.title}" foi aprovada pelo gerente!`;
        // Notificar o criador da tarefa se foi aprovada
        if (oldTask.createdById && !usersToNotify.includes(oldTask.createdById) && oldTask.createdById !== user.id) {
          usersToNotify.push(oldTask.createdById);
        }
      } else if (updatedData.approvalStatus === 'rejected' && oldTask.approvalStatus === 'pending') {
        title = 'Tarefa Rejeitada';
        message = `A solicitação "${oldTask.title}" foi recusada pelo gerente.`;
        if (oldTask.createdById && !usersToNotify.includes(oldTask.createdById) && oldTask.createdById !== user.id) {
          usersToNotify.push(oldTask.createdById);
        }
      }

      await dispatchNotification(title, message, taskId, usersToNotify);
    }
  };

  const deleteTask = async (taskId) => {
    const author = user ? user.name : 'Sistema';
    await api.delete(`/tasks/${taskId}?deletedBy=${encodeURIComponent(author)}`);
    await reloadData();
  };

  const addComment = async (taskId, text, authorName) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newComment = {
      id: 'c_' + Date.now(),
      authorName,
      text,
      date: new Date().toISOString()
    };

    const updatedComments = [...(task.comments || []), newComment];
    await api.put(`/tasks/${taskId}?changedBy=${encodeURIComponent(user?.name || 'Sistema')}`, { comments: updatedComments });
    await reloadData();
    
    const usersToNotify = (task.assignedToIds || []).filter(id => id !== user?.id);
    if (task.createdById && !usersToNotify.includes(task.createdById) && task.createdById !== user?.id) {
      usersToNotify.push(task.createdById);
    }
    
    await dispatchNotification(
      'Novo Comentário',
      `${authorName} comentou na tarefa "${task.title}".`,
      taskId,
      usersToNotify
    );
  };

  // --- CARGOS (JOB TITLES) ---
  const addJobTitle = async (data) => {
    const newJob = { id: 'jt_' + Date.now(), ...data };
    await api.post('/job-titles', newJob);
    await reloadData();
  };
  const updateJobTitle = async (id, updatedData) => {
    await api.put(`/job-titles/${id}?changedBy=${encodeURIComponent(user?.name || 'Sistema')}`, updatedData);
    await reloadData();
  };
  const deleteJobTitle = async (id) => {
    const author = user ? user.name : 'Sistema';
    await api.delete(`/job-titles/${id}?deletedBy=${encodeURIComponent(author)}`);
    const usersToUpdate = users.filter(u => u.jobTitleId === id);
    for (const u of usersToUpdate) {
      await api.put(`/users/${u.id}?changedBy=${encodeURIComponent(user?.name || 'Sistema')}`, { jobTitleId: '' });
    }
    await reloadData();
  };

  // --- DEPARTAMENTOS ---
  const addDepartment = async (deptData) => {
    const newDept = {
      id: 'd_' + Date.now(),
      ...deptData
    };
    await api.post('/departments', newDept);
    await reloadData();
  };

  const updateDepartment = async (deptId, updatedData) => {
    await api.put(`/departments/${deptId}?changedBy=${encodeURIComponent(user?.name || 'Sistema')}`, updatedData);
    await reloadData();
  };

  const deleteDepartment = async (deptId) => {
    console.log('DataContext: deleteDepartment iniciado para ID:', deptId);
    try {
      const author = user ? user.name : 'Sistema';
      console.log('DataContext: disparando requisição DELETE para a API...');
      const res = await api.delete(`/departments/${deptId}?deletedBy=${encodeURIComponent(author)}`);
      console.log('DataContext: Resposta do DELETE da API:', res);
      
      // Opcional: Desatribui usuários e tarefas
      const usersToUpdate = users.filter(u => u.departmentId === deptId);
      console.log('DataContext: Usuários para desatribuir:', usersToUpdate.length);
      for (const u of usersToUpdate) {
        console.log('DataContext: Desatribuindo usuário:', u.id);
        await api.put(`/users/${u.id}?changedBy=${encodeURIComponent(user?.name || 'Sistema')}`, { departmentId: '' });
      }
      const tasksToUpdate = tasks.filter(t => t.departmentId === deptId);
      console.log('DataContext: Tarefas para desatribuir:', tasksToUpdate.length);
      for (const t of tasksToUpdate) {
        console.log('DataContext: Desatribuindo tarefa:', t.id);
        await api.put(`/tasks/${t.id}?changedBy=${encodeURIComponent(user?.name || 'Sistema')}`, { departmentId: '' });
      }
      
      console.log('DataContext: Recarregando dados...');
      await reloadData();
      console.log('DataContext: Dados recarregados.');
    } catch (err) {
      console.error('DataContext: ERRO na exclusão do departamento:', err);
    }
  };

  // --- USUÁRIOS/EQUIPE (Apenas Gerentes podem gerenciar) ---
  const addUser = async (userData) => {
    const cleanEmail = userData.email.trim().toLowerCase();
    
    const newUser = {
      id: 'u_' + Date.now(),
      verified: true, // Usuários criados pelo gerente já começam verificados
      approved: true, // Criados pelo gestor nascem aprovados automaticamente
      ...userData,
      email: cleanEmail
    };
    
    await api.post('/users', newUser);
    await reloadData();
    return newUser;
  };

  const updateUser = async (userId, updatedData) => {
    await api.put(`/users/${userId}?changedBy=${encodeURIComponent(user?.name || 'Sistema')}`, updatedData);
    await reloadData();
  };

  const deleteUser = async (userId) => {
    const author = user ? user.name : 'Sistema';
    await api.delete(`/users/${userId}?deletedBy=${encodeURIComponent(author)}`);
    // Opcional: Desatribui tarefas associadas a esse usuário
    const tasksToUpdate = tasks.filter(t => t.assignedToIds?.includes(userId));
    for (const t of tasksToUpdate) {
      const newAssignedToIds = t.assignedToIds.filter(id => id !== userId);
      await api.put(`/tasks/${t.id}?changedBy=${encodeURIComponent(user?.name || 'Sistema')}`, { assignedToIds: newAssignedToIds, assignedToId: newAssignedToIds[0] || '' });
    }
    await reloadData();
  };

  // --- ANEXOS DE TAREFAS ---

  const addAttachment = async (taskId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadedBy', user ? user.name : 'Usuário');

    const response = await fetch(`http://${window.location.hostname}:3000/api/tasks/${taskId}/attachments`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Erro desconhecido.' }));
      throw new Error(err.error || 'Falha no upload do arquivo.');
    }

    const attachment = await response.json();
    // Atualiza localmente o estado das tarefas sem recarregar tudo
    const updateLocalTask = (list) =>
      list.map(t => t.id === taskId ? { ...t, attachments: [...(t.attachments || []), attachment] } : t);
    setAllTasks(prev => updateLocalTask(prev));
    setTasks(prev => updateLocalTask(prev));
    return attachment;
  };

  const removeAttachment = async (taskId, attachmentId) => {
    const response = await fetch(`http://${window.location.hostname}:3000/api/tasks/${taskId}/attachments/${attachmentId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Erro ao remover.' }));
      throw new Error(err.error || 'Falha ao remover o anexo.');
    }
    // Atualiza localmente
    const updateLocalTask = (list) =>
      list.map(t => t.id === taskId ? { ...t, attachments: (t.attachments || []).filter(a => a.id !== attachmentId) } : t);
    setAllTasks(prev => updateLocalTask(prev));
    setTasks(prev => updateLocalTask(prev));
  };

  return (
    <DataContext.Provider
      value={{
        tasks,
        departments,
        jobTitles,
        users,
        allTasks,
        allDepartments,
        allUsers,
        history,
        updateHistory,
        insertionHistory,
        notifications,
        fetchHistory,
        fetchNotifications,
        markNotificationAsRead,
        dispatchNotification,
        reloadData,
        addTask,
        updateTask,
        deleteTask,
        addComment,
        addDepartment,
        updateDepartment,
        deleteDepartment,
        addJobTitle,
        updateJobTitle,
        deleteJobTitle,
        addUser,
        updateUser,
        deleteUser,
        addAttachment,
        removeAttachment,
        settings,
        updateSetting,
        focusedTaskId,
        setFocusedTaskId
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
