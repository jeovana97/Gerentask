import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useConfirm } from '../context/ConfirmContext';
import TaskAttachments from '../components/TaskAttachments';
import { 
  Plus, 
  Search, 
  Filter, 
  User, 
  Calendar, 
  MessageSquare, 
  Trash2, 
  Edit3, 
  Eye, 
  ArrowRightLeft,
  X,
  Inbox,
  ShieldAlert,
  Send
} from 'lucide-react';

const Tasks = ({ isPersonalOnly = false }) => {
  const { user } = useAuth();
  const { 
    tasks,
    allTasks, 
    departments, 
    users, 
    addTask, 
    updateTask, 
    deleteTask, 
    addComment,
    addAttachment,
    removeAttachment,
    settings,
    dispatchNotification,
    focusedTaskId,
    setFocusedTaskId
  } = useData();
  const confirm = useConfirm();

  const isManager = user.role === 'manager' || user.role === 'master';

  // Determina se o usuário pode editar uma tarefa específica
  // Gerente: pode editar qualquer tarefa
  // Funcionário: pode editar tarefas próprias (pessoais que criou) ou atribuídas a ele
  const canEditTask = (task) => {
    if (!task || task.deletedAt) return false;
    if (isManager) return true;
    const isOwner = task.createdById === user.id;
    const isAssigned = task.assignedToIds?.includes(user.id);
    return isOwner || isAssigned;
  };

  // Abre automaticamente a tarefa focada vinda das notificações
  useEffect(() => {
    if (focusedTaskId) {
      const taskToOpen = allTasks.find(t => t.id === focusedTaskId);
      if (taskToOpen) {
        const isPersonalMatch = isPersonalOnly ? taskToOpen.isPersonal : !taskToOpen.isPersonal;
        if (isPersonalMatch) {
          setSelectedTask(taskToOpen);
          setIsDetailModalOpen(true);
          setFocusedTaskId(null);
        }
      }
    }
  }, [focusedTaskId, allTasks, isPersonalOnly, setFocusedTaskId]);

  // Filtros de busca
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [showSentRequests, setShowSentRequests] = useState(false);

  // Estados dos modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Campos do formulário de criação/edição
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskDeptId, setTaskDeptId] = useState('');
  const [taskAssignedIds, setTaskAssignedIds] = useState([]);
  const [taskCcIds, setTaskCcIds] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);

  // Busca de responsáveis
  const [userSearchTerm, setUserSearchTerm] = useState('');

  const handleCloseCreateModal = async () => {
    if (isEditing) {
      if (await confirm('Você está editando esta tarefa. Tem certeza que deseja sair sem salvar as alterações?', true)) {
        setIsCreateModalOpen(false);
      }
    } else {
      setIsCreateModalOpen(false);
    }
  };

  // Campo de novos comentários
  const [newCommentText, setNewCommentText] = useState('');

  // Anexos no formulário
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [editAttachments, setEditAttachments] = useState([]);

  // Filtragem das tarefas
  const baseTasksList = showDeleted
    ? (isPersonalOnly ? allTasks.filter(t => t.isPersonal && t.createdById === user.id) : allTasks.filter(t => !t.isPersonal))
    : (isPersonalOnly ? tasks.filter(t => t.isPersonal && t.createdById === user.id) : tasks.filter(t => !t.isPersonal));
  
  const filteredTasks = baseTasksList.filter(task => {
    // Apenas tarefas aprovadas aparecem no Kanban
    const isApproved = task.approvalStatus === 'approved' || !task.approvalStatus;
    if (!task.deletedAt && !isApproved) {
      return false;
    }

    // Filtro de arquivadas
    if (showArchived) {
      if (task.status !== 'archived') return false;
    } else {
      if (task.status === 'archived') return false;
    }

    // Restrição de perfil
    if (user.role === 'manager') {
      // Gerente só vê tarefas do seu departamento
      if (task.departmentId !== user.departmentId) {
        return false;
      }
    } else if (user.role === 'master') {
      // Master vê todas as tarefas de todos os departamentos
    } else {
      // Funcionário só vê tarefas atribuídas a ele ou que está em cópia
      if (!task.assignedToIds?.includes(user.id) && !task.ccIds?.includes(user.id)) {
        return false;
      }
    }

    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          task.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDept = filterDept ? task.departmentId === filterDept : true;
    
    // Gerente filtra por qualquer usuário, funcionário só vê dele
    const matchesUser = isManager 
      ? (filterUser ? (task.assignedToIds?.includes(filterUser) || task.ccIds?.includes(filterUser)) : true) 
      : true;
      
    const matchesPriority = filterPriority ? task.priority === filterPriority : true;

    return matchesSearch && matchesDept && matchesUser && matchesPriority;
  });

  // Separação por colunas
  const todoTasks = filteredTasks.filter(t => t.status === 'todo');
  const doingTasks = filteredTasks.filter(t => t.status === 'doing');
  const doneTasks = filteredTasks.filter(t => t.status === 'done');
  const archivedTasks = filteredTasks.filter(t => t.status === 'archived');
  const deletedTasks = filteredTasks.filter(t => t.deletedAt);

  // Função para somar dias úteis
  const addBusinessDays = (startDate, daysToAdd) => {
    let date = new Date(startDate);
    let addedDays = 0;
    while (addedDays < daysToAdd) {
      date.setDate(date.getDate() + 1);
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        addedDays++;
      }
    }
    return date.toISOString().split('T')[0];
  };

  // Abre modal de criação
  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setTaskTitle('');
    setTaskDesc('');
    setTaskPriority('medium');
    
    const defaultDays = settings?.defaultDueDates?.medium || 7;
    setTaskDueDate(addBusinessDays(new Date(), defaultDays));
    
    setTaskDeptId(departments[0]?.id || '');
    setTaskAssignedIds([]);
    setTaskCcIds([]);
    setPendingAttachments([]);
    setEditAttachments([]);
    setIsCreateModalOpen(true);
  };

  // Abre modal de edição
  const handleOpenEditModal = (task, e) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditingTaskId(task.id);
    setTaskTitle(task.title);
    setTaskDesc(task.description);
    setTaskPriority(task.priority);
    setTaskDueDate(task.dueDate);
    setTaskDeptId(task.departmentId);
    setTaskAssignedIds(task.assignedToIds || []);
    setTaskCcIds(task.ccIds || []);
    setPendingAttachments([]);
    setEditAttachments(task.attachments || []);
    setIsCreateModalOpen(true);
  };

  // Salva tarefa (criação ou edição)
  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskDesc.trim() || !taskDueDate) {
      confirm.alert('Preencha os campos obrigatórios.');
      return;
    }

    if (!isPersonalOnly && taskAssignedIds.length === 0) {
      const proceed = await confirm('Esta tarefa está sem funcionários responsáveis atribuídos. Tem certeza que deseja gravar a tarefa sem inserir ninguém?');
      if (!proceed) {
        return;
      }
    }

    const taskData = {
      title: taskTitle,
      description: taskDesc,
      priority: taskPriority,
      dueDate: taskDueDate,
      departmentId: isPersonalOnly ? user.departmentId : taskDeptId,
      assignedToIds: isPersonalOnly ? [user.id] : taskAssignedIds,
      ccIds: isPersonalOnly ? [] : taskCcIds,
      isPersonal: isPersonalOnly,
      status: isEditing ? tasks.find(t => t.id === editingTaskId)?.status || 'todo' : 'todo'
    };

    try {
      if (isEditing) {
        await updateTask(editingTaskId, taskData);
      } else {
        const newTask = await addTask(taskData);
        // Faz o upload dos anexos pendentes após criar a tarefa
        for (const att of pendingAttachments) {
          if (att.file) {
            await addAttachment(newTask.id, att.file);
          }
        }
      }
      setIsCreateModalOpen(false);
    } catch (err) {
      confirm.alert(err.message);
    }
  };

  // Exclui tarefa
  const handleDeleteTask = async (id, e) => {
    e.stopPropagation();
    if (await confirm('Deseja realmente excluir esta tarefa?', true)) {
      try {
        await deleteTask(id);
        if (selectedTask?.id === id) {
          setIsDetailModalOpen(false);
        }
      } catch (err) {
        confirm.alert(err.message);
      }
    }
  };

  // Muda status da tarefa
  const handleMoveTask = async (taskId, newStatus, e) => {
    if (e) e.stopPropagation();

    const task = tasks.find(t => t.id === taskId) || allTasks.find(t => t.id === taskId);
    
    // Trava de segurança para "Enviadas"
    const isSentRequest = !task.isPersonal && task.createdById === user.id && task.departmentId !== user.departmentId;
    if (isSentRequest) {
      confirm.alert("Você não pode alterar o andamento de uma tarefa que pertence a outro setor.");
      return;
    }

    if (task && task.status === 'todo' && (newStatus === 'done' || newStatus === 'archived')) {
      confirm.alert('Tarefas não iniciadas não podem ser movidas diretamente para "Concluída" ou "Arquivada". Mude para "Em Andamento" primeiro.');
      return;
    }

    try {
      await updateTask(taskId, { status: newStatus });
      if (selectedTask?.id === taskId) {
        setSelectedTask(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      confirm.alert(err.message);
    }
  };

  // Abre detalhes da tarefa
  const handleOpenDetails = (task) => {
    setSelectedTask(task);
    setIsDetailModalOpen(true);
  };

  // Adiciona comentário
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    try {
      await addComment(selectedTask.id, newCommentText, user.name);
      
      // O addComment agora recarrega a task list (tasks).
      // Mas selectedTask não será recarregada automaticamente, então fazemos manual ou esperamos re-render:
      // Pra simplificar, adicionamos o comentário ao estado selectedTask:
      setSelectedTask(prev => ({
        ...prev,
        comments: [
          ...(prev.comments || []),
          { id: 'tmp_' + Date.now(), authorName: user.name, text: newCommentText, date: new Date().toISOString() }
        ]
      }));
      
      setNewCommentText('');
    } catch (err) {
      confirm.alert(err.message);
    }
  };

  const handleRequestStatus = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;
    
    // Obter IDs dos envolvidos (criador + designados), excluindo o usuário atual
    const involvedIds = new Set(selectedTask.assignedToIds || []);
    if (selectedTask.createdById) involvedIds.add(selectedTask.createdById);
    involvedIds.delete(user.id);
    
    const idsArray = Array.from(involvedIds);
    if (idsArray.length === 0) {
      confirm.alert("Não há outros usuários envolvidos para notificar.");
      return;
    }
    
    try {
      await dispatchNotification(
        "Posicionamento Solicitado",
        `${user.name} solicitou um posicionamento na tarefa: ${selectedTask.title}`,
        selectedTask.id,
        idsArray,
        true // priority = true
      );
      confirm.alert("Pedido de posicionamento enviado aos envolvidos.");
    } catch (err) {
      confirm.alert(err.message);
    }
  };

  // Adiciona anexo à tarefa aberta
  const handleAddAttachment = async (file) => {
    const newAtt = await addAttachment(selectedTask.id, file);
    setSelectedTask(prev => ({ ...prev, attachments: [...(prev.attachments || []), newAtt] }));
  };

  // Remove anexo da tarefa aberta
  const handleRemoveAttachment = async (attachmentId) => {
    await removeAttachment(selectedTask.id, attachmentId);
    setSelectedTask(prev => ({ ...prev, attachments: (prev.attachments || []).filter(a => a.id !== attachmentId) }));
  };

  // Anexos no formulário (Criação/Edição)
  const handleAddFormAttachment = async (file) => {
    if (isEditing) {
      const newAtt = await addAttachment(editingTaskId, file);
      setEditAttachments(prev => [...(prev || []), newAtt]);
    } else {
      const isImage = file.type.startsWith('image/');
      let data = null;
      if (isImage) {
        data = await new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = e => resolve(e.target.result);
          reader.readAsDataURL(file);
        });
      }
      const tempAtt = {
        id: 'temp_' + Date.now() + Math.random(),
        name: file.name,
        type: file.type,
        size: file.size,
        data: data,
        uploadedBy: user.name,
        file: file
      };
      setPendingAttachments(prev => [...(prev || []), tempAtt]);
    }
  };

  const handleRemoveFormAttachment = async (attachmentId) => {
    if (isEditing) {
      await removeAttachment(editingTaskId, attachmentId);
      setEditAttachments(prev => (prev || []).filter(a => a.id !== attachmentId));
    } else {
      setPendingAttachments(prev => (prev || []).filter(a => a.id !== attachmentId));
    }
  };

  // Auxiliares de visualização
  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'high': return 'badge-high';
      case 'medium': return 'badge-medium';
      case 'low': return 'badge-low';
      default: return 'badge-low';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      case 'low': return 'Baixa';
      default: return 'Baixa';
    }
  };

  const handlePriorityChange = (e) => {
    const newPriority = e.target.value;
    setTaskPriority(newPriority);
    
    // Se estiver criando nova tarefa, atualiza o prazo baseando nos dias úteis definidos
    if (!isEditing) {
      const defaultDays = settings?.defaultDueDates?.[newPriority] ?? (newPriority === 'high' ? 3 : newPriority === 'low' ? 14 : 7);
      setTaskDueDate(addBusinessDays(new Date(), defaultDays));
    }
  };

  return (
    <div className="page-container animate-fade-in">
      {/* Header interno */}
      <div className="flex-between" style={{ marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>
            Quadro de Tarefas
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Acompanhe as demandas da equipe através do fluxo Kanban.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => { setShowArchived(!showArchived); setShowDeleted(false); }}
            className={`btn ${showArchived ? 'btn-primary' : 'btn-secondary'}`}
          >
            {showArchived ? 'Ocultar Arquivadas' : 'Ver Arquivadas'}
          </button>
          <button
            onClick={() => { setShowDeleted(!showDeleted); setShowArchived(false); }}
            className={`btn ${showDeleted ? 'btn-primary' : 'btn-secondary'}`}
          >
            {showDeleted ? 'Ocultar Excluídas' : 'Mostrar Excluídas'}
          </button>
          {!isPersonalOnly && (
            <button
              onClick={() => { setShowSentRequests(!showSentRequests); setShowArchived(false); setShowDeleted(false); }}
              className={`btn ${showSentRequests ? 'btn-primary' : 'btn-secondary'}`}
              title="Tarefas enviadas por você"
            >
              <Send size={18} />
              <span>Enviadas</span>
            </button>
          )}
          <button onClick={handleOpenCreateModal} className="btn btn-primary">
            <Plus size={18} />
            <span>{isPersonalOnly ? 'Criar Tarefa Própria' : 'Criar Nova Tarefa'}</span>
          </button>
        </div>
      </div>

      {/* SEÇÃO DE APROVAÇÕES PENDENTES (Apenas para Gerentes/Master do Departamento do Criador) */}
      {!isPersonalOnly && isManager && tasks.filter(t => t.approvalStatus === 'pending' && (user.role === 'master' || users.find(u => u.id === t.createdById)?.departmentId === user.departmentId)).length > 0 && (
        <div className="glass-card" style={{ padding: '20px', marginBottom: '24px', borderLeft: '4px solid var(--warning)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>
            Solicitações de Tarefas Pendentes de Aprovação ({tasks.filter(t => t.approvalStatus === 'pending' && (user.role === 'master' || users.find(u => u.id === t.createdById)?.departmentId === user.departmentId)).length})
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {tasks.filter(t => t.approvalStatus === 'pending' && (user.role === 'master' || users.find(u => u.id === t.createdById)?.departmentId === user.departmentId)).map(t => {
              const workers = users.filter(u => t.assignedToIds?.includes(u.id));
              return (
                <div key={t.id} onClick={() => handleOpenDetails(t)} className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid var(--border-color)', cursor: 'pointer' }}>
                  <div>
                    <div className="flex-between">
                      <span className={`badge ${getPriorityBadgeClass(t.priority)}`} style={{ fontSize: '0.65rem' }}>Prioridade {getPriorityLabel(t.priority)}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Prazo: {t.dueDate.split('-').reverse().join('/')}</span>
                    </div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)', marginTop: '8px' }}>{t.title}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.description}</p>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                    <span>Solicitado por: <strong>{t.createdBy || 'Funcionário'}</strong></span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>Resp:</span>
                      <div style={{ display: 'flex' }}>
                        {workers.slice(0, 3).map((w, idx) => (
                          <div key={w.id} className="avatar-circle" style={{ width: '16px', height: '16px', fontSize: '0.55rem', marginLeft: idx > 0 ? '-6px' : '0', border: '1px solid var(--bg-card)' }} title={w.name}>
                            {w.name.charAt(0).toUpperCase()}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button onClick={async (e) => { 
                      e.stopPropagation(); 
                      const reason = await confirm.prompt(`Qual o motivo da rejeição da tarefa "${t.title}"?`, true);
                      if (reason !== null && reason.trim() !== '') {
                        updateTask(t.id, { approvalStatus: 'rejected', rejectionReason: reason.trim() }); 
                      } else if (reason !== null) {
                        confirm.alert('O motivo da rejeição é obrigatório.');
                      }
                    }} className="btn btn-secondary" style={{ flex: 1, padding: '6px 12px', fontSize: '0.75rem', color: 'var(--danger)' }}>
                      Rejeitar
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); updateTask(t.id, { approvalStatus: 'approved' }); }} className="btn btn-primary" style={{ flex: 1, padding: '6px 12px', fontSize: '0.75rem' }}>
                      Aprovar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SEÇÃO DE ACOMPANHAMENTO DE SOLICITAÇÕES (Apenas para Funcionários) */}
      {!isPersonalOnly && !isManager && tasks.filter(t => t.createdById === user.id && (t.approvalStatus === 'pending' || t.approvalStatus === 'rejected')).length > 0 && (
        <div className="glass-card" style={{ padding: '24px', marginBottom: '28px', borderLeft: '4px solid var(--warning)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowRightLeft size={18} style={{ color: 'var(--warning)' }} />
            Minhas Solicitações de Tarefas ({tasks.filter(t => t.createdById === user.id && (t.approvalStatus === 'pending' || t.approvalStatus === 'rejected')).length})
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {tasks.filter(t => t.createdById === user.id && (t.approvalStatus === 'pending' || t.approvalStatus === 'rejected')).map(t => {
              const worker = users.find(u => u.id === t.assignedToId);
              const dept = departments.find(d => d.id === t.departmentId)?.name || 'Outro';
              const isRejected = t.approvalStatus === 'rejected';
              return (
                <div key={t.id} className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <div className="flex-between">
                      <span className={`badge ${getPriorityBadgeClass(t.priority)}`} style={{ fontSize: '0.65rem' }}>Prioridade {getPriorityLabel(t.priority)}</span>
                      <span className={`badge`} style={{ 
                        fontSize: '0.65rem', 
                        background: isRejected ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
                        color: isRejected ? 'var(--danger)' : 'var(--warning)' 
                      }}>
                        {isRejected ? 'Rejeitada' : 'Pendente'}
                      </span>
                    </div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)', marginTop: '8px' }}>{t.title}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</p>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                    <span>Setor: <strong>{dept}</strong></span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>Resp: {worker?.name.split(' ')[0]}</span>
                      <div className="avatar-circle" style={{ width: '16px', height: '16px', fontSize: '0.55rem' }}>
                        {worker?.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                  </div>

                  {isRejected && (
                    <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--danger)', marginTop: '8px' }}>
                      <strong>Motivo da rejeição:</strong> {t.rejectionReason || 'Nenhum motivo informado.'}
                    </div>
                  )}

                  {isRejected && (
                    <button onClick={() => deleteTask(t.id)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.7rem', width: '100%', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Limpar Solicitação Rejeitada
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Seção de Filtros */}
      <div className="glass-card" style={{ padding: '20px', marginBottom: '28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isPersonalOnly ? '2fr 1fr' : '2fr 1fr 1fr 1fr', gap: '16px', flexWrap: 'wrap' }}>
          {/* Busca por texto */}
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar pelo título ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '40px' }}
            />
          </div>

          {/* Filtro por Departamento e Responsável (Apenas se não for pessoal) */}
          {!isPersonalOnly && (
            <>
              {/* Filtro por Departamento */}
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="form-select"
              >
                <option value="">Todos Setores</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              {/* Filtro por Funcionário (Apenas visível para Gerente) */}
              {isManager ? (
                <select
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  className="form-select"
                >
                  <option value="">Qualquer Membro</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role === 'manager' ? 'Gerente' : 'Func.'})</option>
                  ))}
                </select>
              ) : (
                <div className="form-input" style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.8, background: 'var(--border-color)' }}>
                  <User size={16} />
                  <span style={{ fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Atribuído a mim</span>
                </div>
              )}
            </>
          )}

          {/* Filtro por Prioridade */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="form-select"
          >
            <option value="">Qualquer Prioridade</option>
            <option value="high">Prioridade Alta</option>
            <option value="medium">Prioridade Média</option>
            <option value="low">Prioridade Baixa</option>
          </select>
        </div>
      </div>

      {/* Visualização (Lista para Pessoais, Kanban para Corporativas) */}
      {showSentRequests ? (
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', color: 'var(--text-primary)' }}>
            <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-primary)' }}></span>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>Tarefas Enviadas ({allTasks.filter(t => !t.isPersonal && !t.deletedAt && t.createdById === user.id && !t.assignedToIds?.includes(user.id)).length})</h3>
          </div>
          {allTasks.filter(t => !t.isPersonal && !t.deletedAt && t.createdById === user.id && !t.assignedToIds?.includes(user.id)).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>
              <p>Nenhuma tarefa enviada.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {allTasks.filter(t => !t.isPersonal && !t.deletedAt && t.createdById === user.id && !t.assignedToIds?.includes(user.id)).map(task => {
                const isApproved = task.approvalStatus === 'approved' || !task.approvalStatus;
                const isRejected = task.approvalStatus === 'rejected';
                return (
                <div 
                  key={task.id} 
                  onClick={() => handleOpenDetails(task)}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '16px', 
                    background: 'rgba(255,255,255,0.02)', 
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
                    <div style={{
                      minWidth: '40px',
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span className={`badge ${getPriorityBadgeClass(task.priority)}`} style={{ padding: '4px', borderRadius: '4px', fontSize: '0.65rem' }} title={`Prioridade ${getPriorityLabel(task.priority)}`}>
                        {task.priority.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {task.title}
                      </h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Destino: {departments.find(d => d.id === task.departmentId)?.name || 'Geral'}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Responsável: {task.assignedToIds?.length > 0 ? task.assignedToIds.map(id => users.find(u => u.id === id)?.name || 'Desconhecido').join(', ') : 'Nenhum'}
                      </p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginLeft: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      <Calendar size={14} />
                      <span>{task.dueDate.split('-').reverse().join('/')}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {!isApproved ? (
                        <span className="badge" style={{ background: isRejected ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: isRejected ? 'var(--danger)' : 'var(--warning)' }}>
                          {isRejected ? 'Rejeitada' : 'Aguardando'}
                        </span>
                      ) : (
                        <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.1)', color: 'var(--text-primary)' }}>
                          {task.status === 'done' ? 'Concluída' : task.status === 'archived' ? 'Arquivada' : task.status === 'doing' ? 'Em Andamento' : 'A Fazer'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      ) : showArchived ? (
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', color: 'var(--text-primary)' }}>
            <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--text-muted)' }}></span>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>Tarefas Arquivadas ({archivedTasks.length})</h3>
          </div>
          {archivedTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>
              <p>Nenhuma tarefa arquivada.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {archivedTasks.map(task => (
                <div 
                  key={task.id} 
                  onClick={() => handleOpenDetails(task)}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '16px', 
                    background: 'rgba(255,255,255,0.02)', 
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    opacity: 0.8
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
                    <div style={{
                      minWidth: '40px',
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span className={`badge ${getPriorityBadgeClass(task.priority)}`} style={{ padding: '4px', borderRadius: '4px', fontSize: '0.65rem' }} title={`Prioridade ${getPriorityLabel(task.priority)}`}>
                        {task.priority.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {task.title}
                      </h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {task.description}
                      </p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginLeft: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      <Calendar size={14} />
                      <span>{task.dueDate.split('-').reverse().join('/')}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={e => e.stopPropagation()}>
                      <span className="badge badge-high" style={{ background: 'var(--bg-dark)' }}>Arquivada</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : showDeleted ? (
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', color: 'var(--text-primary)' }}>
            <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--danger)' }}></span>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>Tarefas Excluídas ({deletedTasks.length})</h3>
          </div>
          {deletedTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>
              <p>Nenhuma tarefa excluída.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {deletedTasks.map(task => (
                <div 
                  key={task.id} 
                  onClick={() => handleOpenDetails(task)}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '16px', 
                    background: 'rgba(255,255,255,0.02)', 
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    opacity: 0.8
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
                    <div style={{
                      minWidth: '40px',
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span className={`badge ${getPriorityBadgeClass(task.priority)}`} style={{ padding: '4px', borderRadius: '4px', fontSize: '0.65rem' }} title={`Prioridade ${getPriorityLabel(task.priority)}`}>
                        {task.priority.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {task.title}
                      </h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {task.description}
                      </p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginLeft: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      <Calendar size={14} />
                      <span>{task.dueDate.split('-').reverse().join('/')}</span>
                    </div>
                    {task.deletedBy && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        por: <strong>{task.deletedBy}</strong>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={e => e.stopPropagation()}>
                      <span className="badge" style={{ background: 'var(--danger)', color: '#ffffff' }}>Excluída</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : isPersonalOnly ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {[
            { id: 'todo', label: 'A Fazer', color: 'var(--text-secondary)' },
            { id: 'doing', label: 'Em Andamento', color: 'var(--info)' },
            { id: 'done', label: 'Concluídas', color: 'var(--success)' }
          ].map(statusGroup => {
            const groupTasks = filteredTasks.filter(t => t.status === statusGroup.id);
            return (
              <div key={statusGroup.id} className="glass-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', color: 'var(--text-primary)' }}>
                  <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: statusGroup.color }}></span>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>{statusGroup.label} ({groupTasks.length})</h3>
                </div>

                {groupTasks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>
                    <p>Nenhuma tarefa nesta coluna.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {groupTasks.map(task => (
                      <div 
                        key={task.id} 
                        onClick={() => handleOpenDetails(task)}
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          padding: '16px', 
                          background: 'rgba(255,255,255,0.02)', 
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
                          <div style={{
                            minWidth: '40px',
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            background: 'rgba(255,255,255,0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <span className={`badge ${getPriorityBadgeClass(task.priority)}`} style={{ padding: '4px', borderRadius: '4px', fontSize: '0.65rem' }} title={`Prioridade ${getPriorityLabel(task.priority)}`}>
                              {task.priority.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {task.title}
                            </h4>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {task.description}
                            </p>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginLeft: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            <Calendar size={14} />
                            <span>{task.dueDate.split('-').reverse().join('/')}</span>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={e => e.stopPropagation()}>
                            <select 
                              value={task.status}
                              onChange={(e) => handleMoveTask(task.id, e.target.value, e)}
                              className="form-select"
                              style={{ padding: '6px 28px 6px 12px', fontSize: '0.8rem', minWidth: '130px', height: '32px' }}
                            >
                              <option value="todo">A Fazer</option>
                              <option value="doing">Em Andamento</option>
                              <option value="done">Concluída</option>
                            </select>
                            
                            {canEditTask(task) && (
                              <>
                                <button onClick={(e) => handleOpenEditModal(task, e)} className="btn-icon" style={{ padding: '6px', background: 'rgba(255,255,255,0.05)' }} title="Editar">
                                  <Edit3 size={14} />
                                </button>
                                <button onClick={(e) => handleDeleteTask(task.id, e)} className="btn-icon" style={{ padding: '6px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }} title="Excluir">
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
      <div className="kanban-board">
        {/* Coluna A Fazer */}
        <div className="kanban-column">
          <div className="kanban-header">
            <span className="kanban-title">
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-secondary)' }}></span>
              A Fazer
            </span>
            <span className="kanban-count">{todoTasks.length}</span>
          </div>

          <div className="kanban-cards-container">
            {todoTasks.map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                departments={departments} 
                users={users} 
                onClick={() => handleOpenDetails(task)}
                onMove={(status) => handleMoveTask(task.id, status)}
                onEdit={(e) => handleOpenEditModal(task, e)}
                onDelete={(e) => handleDeleteTask(task.id, e)}
                isManager={isManager}
                canEdit={canEditTask(task)}
              />
            ))}
            {todoTasks.length === 0 && <EmptyColumnState />}
          </div>
        </div>

        {/* Coluna Em Andamento */}
        <div className="kanban-column">
          <div className="kanban-header">
            <span className="kanban-title">
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--info)' }}></span>
              Em Andamento
            </span>
            <span className="kanban-count">{doingTasks.length}</span>
          </div>

          <div className="kanban-cards-container">
            {doingTasks.map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                departments={departments} 
                users={users} 
                onClick={() => handleOpenDetails(task)}
                onMove={(status) => handleMoveTask(task.id, status)}
                onEdit={(e) => handleOpenEditModal(task, e)}
                onDelete={(e) => handleDeleteTask(task.id, e)}
                isManager={isManager}
                canEdit={canEditTask(task)}
              />
            ))}
            {doingTasks.length === 0 && <EmptyColumnState />}
          </div>
        </div>

        {/* Coluna Concluídas */}
        <div className="kanban-column">
          <div className="kanban-header">
            <span className="kanban-title">
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></span>
              Concluídas
            </span>
            <span className="kanban-count">{doneTasks.length}</span>
          </div>

          <div className="kanban-cards-container">
            {doneTasks.map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                departments={departments} 
                users={users} 
                onClick={() => handleOpenDetails(task)}
                onMove={(status) => handleMoveTask(task.id, status)}
                onEdit={(e) => handleOpenEditModal(task, e)}
                onDelete={(e) => handleDeleteTask(task.id, e)}
                isManager={isManager}
                canEdit={canEditTask(task)}
              />
            ))}
            {doneTasks.length === 0 && <EmptyColumnState />}
          </div>
        </div>
      </div>
      )}

      {/* --- MODAL DE CRIAÇÃO / EDIÇÃO DE TAREFA (GERENTE) --- */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onMouseDown={handleCloseCreateModal}>
          <div className="modal-content" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                {isPersonalOnly 
                  ? (isEditing ? 'Editar Tarefa Própria' : 'Criar Tarefa Própria') 
                  : (isEditing ? 'Editar Detalhes da Tarefa' : 'Criar Nova Demanda')}
              </h3>
              <button onClick={handleCloseCreateModal} className="btn-icon">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveTask}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Título da Tarefa *</label>
                  <input
                    type="text"
                    placeholder="Ex: Refatorar fluxo de autenticação"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Descrição / Requisitos *</label>
                  <textarea
                    rows="4"
                    placeholder="Descreva detalhadamente o que precisa ser feito..."
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    className="form-textarea"
                    required
                  ></textarea>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Prioridade</label>
                    <select
                      value={taskPriority}
                      onChange={handlePriorityChange}
                      className="form-select"
                    >
                      <option value="low">Baixa</option>
                      <option value="medium">Média</option>
                      <option value="high">Alta</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Data Limite *</label>
                    <input
                      type="date"
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                {/* Se não for pessoal, mostra departamento e responsáveis */}
                {!isPersonalOnly && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">Departamento (Automático)</label>
                      <select
                        value={taskDeptId}
                        onChange={(e) => setTaskDeptId(e.target.value)}
                        className="form-select"
                        disabled
                        style={{ opacity: 0.7, cursor: 'not-allowed', background: 'rgba(255,255,255,0.05)' }}
                      >
                              <option value="">Aguardando seleção do responsável...</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        Equipe Envolvida
                      </label>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                          <input
                            type="text"
                            placeholder="Buscar funcionário..."
                            value={userSearchTerm}
                            onChange={(e) => setUserSearchTerm(e.target.value)}
                            className="form-input"
                            style={{ paddingLeft: '32px' }}
                          />
                        </div>
                        {userSearchTerm.trim() !== '' && (
                          <button 
                            type="button" 
                            className="btn btn-primary" 
                            onClick={() => setUserSearchTerm('')}
                            style={{ padding: '0 16px', fontSize: '0.85rem' }}
                          >
                            Confirmar
                          </button>
                        )}
                      </div>
                      <div style={{ maxHeight: '180px', overflowY: 'auto', background: 'rgba(255,255,255,0.02)', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                          <div style={{ textAlign: 'left' }}>Nome</div>
                          <div>Resp.</div>
                          <div>CC</div>
                        </div>
                        {users.filter(u => {
                          if (userSearchTerm.trim() !== '') {
                            return u.name.toLowerCase().includes(userSearchTerm.toLowerCase());
                          }
                          return taskAssignedIds.includes(u.id) || taskCcIds.includes(u.id);
                        }).map(u => (
                          <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px', gap: '8px', alignItems: 'center', marginBottom: '6px', fontSize: '0.85rem' }}>
                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={u.name}>
                              {u.name} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({u.role === 'manager' ? 'Gerente' : 'Func.'})</span>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <input 
                                type="radio" 
                                name="taskAssignee"
                                checked={taskAssignedIds.includes(u.id)}
                                onChange={() => {
                                  setTaskAssignedIds([u.id]);
                                  // Se virou responsável, tira do CC
                                  if (taskCcIds.includes(u.id)) {
                                    setTaskCcIds(taskCcIds.filter(id => id !== u.id));
                                  }
                                  if (u.departmentId) setTaskDeptId(u.departmentId);
                                }}
                              />
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <input 
                                type="checkbox" 
                                checked={taskCcIds.includes(u.id)}
                                disabled={taskAssignedIds.includes(u.id)} // Não pode ser CC e Responsável ao mesmo tempo
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setTaskCcIds([...taskCcIds, u.id]);
                                  } else {
                                    setTaskCcIds(taskCcIds.filter(id => id !== u.id));
                                  }
                                }}
                              />
                            </div>
                          </div>
                        ))}
                        {userSearchTerm.trim() === '' && taskAssignedIds.length === 0 && taskCcIds.length === 0 && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
                            Pesquise para adicionar envolvidos
                          </div>
                        )}
                        {userSearchTerm.trim() !== '' && users.filter(u => u.name.toLowerCase().includes(userSearchTerm.toLowerCase())).length === 0 && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
                            Nenhum funcionário encontrado
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Seção de Anexos do Formulário */}
                <div style={{ marginTop: '8px' }}>
                  <TaskAttachments
                    taskId={isEditing ? editingTaskId : 'new'}
                    attachments={isEditing ? editAttachments : pendingAttachments}
                    onAdd={handleAddFormAttachment}
                    onRemove={handleRemoveFormAttachment}
                    canEdit={true}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={handleCloseCreateModal} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {isEditing ? 'Salvar Alterações' : 'Criar Tarefa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL DE DETALHES E COMENTÁRIOS DA TAREFA --- */}
      {isDetailModalOpen && selectedTask && (
        <div className="modal-overlay" onMouseDown={() => setIsDetailModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '680px' }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className={`badge ${getPriorityBadgeClass(selectedTask.priority)}`}>
                  Prioridade {getPriorityLabel(selectedTask.priority)}
                </span>
                <span className={`badge badge-${selectedTask.status}`}>
                  {selectedTask.status === 'todo' ? 'A Fazer' : selectedTask.status === 'doing' ? 'Fazendo' : selectedTask.status === 'archived' ? 'Arquivada' : 'Concluída'}
                </span>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="btn-icon">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>
                  {selectedTask.title}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                  {selectedTask.description}
                </p>
              </div>

              {/* Setor e Prazo */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                padding: '16px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-color)',
                fontSize: '0.9rem'
              }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Criado por</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                    <div className="avatar-circle" style={{ width: '16px', height: '16px', fontSize: '0.55rem', background: 'var(--primary)', color: 'white' }}>
                      {(selectedTask.createdBy || 'S').charAt(0).toUpperCase()}
                    </div>
                    <strong style={{ fontSize: '0.85rem' }}>{selectedTask.createdBy || 'Sistema'}</strong>
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Setor Responsável</span>
                  <strong>{selectedTask.isPersonal ? 'Pessoal' : (departments.find(d => d.id === selectedTask.departmentId)?.name || 'Não atribuído')}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Responsáveis Atribuídos</span>
                  {selectedTask.isPersonal ? (
                    <strong>Apenas Eu</strong>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                      {users.filter(u => selectedTask.assignedToIds?.includes(u.id)).map(u => (
                        <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                          <div className="avatar-circle" style={{ width: '16px', height: '16px', fontSize: '0.55rem' }}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontSize: '0.75rem' }}>{u.name.split(' ')[0]}</span>
                        </div>
                      ))}
                      {(!selectedTask.assignedToIds || selectedTask.assignedToIds.length === 0) && (
                        <span style={{ fontSize: '0.75rem' }}>Desatribuído</span>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Data de Vencimento</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <Calendar size={14} className="text-secondary" />
                    <strong>{selectedTask.dueDate.split('-').reverse().join('/')}</strong>
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Ações de Status</span>
                  {!selectedTask.deletedAt ? (
                    selectedTask.status === 'archived' ? (
                      <span className="badge badge-high" style={{ marginTop: '4px', background: 'var(--bg-dark)' }}>Somente Leitura</span>
                    ) : selectedTask.approvalStatus === 'pending' && isManager && (user.role === 'master' || users.find(u => u.id === selectedTask.createdById)?.departmentId === user.departmentId) ? (
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                        <button onClick={() => { updateTask(selectedTask.id, { approvalStatus: 'rejected' }); setIsDetailModalOpen(false); }} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--danger)' }}>Rejeitar</button>
                        <button onClick={() => { updateTask(selectedTask.id, { approvalStatus: 'approved' }); setIsDetailModalOpen(false); }} className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Aprovar</button>
                      </div>
                    ) : (!selectedTask.isPersonal && selectedTask.createdById === user.id && selectedTask.departmentId !== user.departmentId) ? (
                      <span className="badge" style={{ marginTop: '4px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>Tarefa de outro setor</span>
                    ) : (
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                        {selectedTask.status !== 'todo' && (
                          <button onClick={() => handleMoveTask(selectedTask.id, 'todo')} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>A Fazer</button>
                        )}
                        {selectedTask.status !== 'doing' && (
                          <button onClick={() => handleMoveTask(selectedTask.id, 'doing')} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Fazer</button>
                        )}
                        {selectedTask.status !== 'done' && (
                          <button onClick={() => handleMoveTask(selectedTask.id, 'done')} className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Concluir</button>
                        )}
                        {selectedTask.status === 'done' && (
                          <button onClick={() => handleMoveTask(selectedTask.id, 'archived')} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>Arquivar</button>
                        )}
                        {selectedTask.status !== 'done' && selectedTask.status !== 'archived' && (
                          <button onClick={handleRequestStatus} className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'var(--warning)', color: '#000', border: 'none' }}>Pedir Posicionamento</button>
                        )}
                      </div>
                    )
                  ) : (
                    <span className="badge badge-high" style={{ marginTop: '4px' }}>Excluída</span>
                  )}
                </div>
              </div>

              {/* Seção de Anexos */}
              <TaskAttachments
                taskId={selectedTask.id}
                attachments={selectedTask.attachments || []}
                onAdd={handleAddAttachment}
                onRemove={handleRemoveAttachment}
                canEdit={false} // Na visualização, anexos não podem ser alterados
              />

              {/* Seção de Comentários */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <MessageSquare size={16} />
                  Feedback e Comentários ({selectedTask.comments?.length || 0})
                </h4>

                {/* Lista de Comentários */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '200px', overflowY: 'auto', marginBottom: '16px' }}>
                  {selectedTask.comments && selectedTask.comments.length > 0 ? (
                    [...selectedTask.comments].sort((a, b) => new Date(a.date) - new Date(b.date)).map(c => {
                      const isMine = c.authorName === user.name;
                      return (
                        <div key={c.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', marginBottom: '8px' }}>
                          {!isMine && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', marginLeft: '8px' }}>
                              {c.authorName}
                            </span>
                          )}
                          <div style={{
                            maxWidth: '85%',
                            padding: '10px 14px',
                            borderRadius: '16px',
                            borderBottomRightRadius: isMine ? '4px' : '16px',
                            borderBottomLeftRadius: !isMine ? '4px' : '16px',
                            background: isMine ? 'var(--accent-primary)' : 'rgba(255,255,255,0.03)',
                            color: isMine ? '#fff' : 'var(--text-primary)',
                            border: isMine ? 'none' : '1px solid var(--border-color)',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                          }}>
                            <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>{c.text}</p>
                            <div style={{ textAlign: 'right', marginTop: '4px' }}>
                              <span style={{ fontSize: '0.65rem', color: isMine ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>
                                {new Date(c.date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '10px 0' }}>
                      Nenhum comentário registrado nesta tarefa.
                    </p>
                  )}
                </div>

                {/* Form de comentário */}
                {selectedTask.status !== 'archived' && (
                  <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      placeholder="Adicionar observação ou andamento..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      className="form-input"
                      style={{ flex: 1 }}
                      required
                    />
                    <button type="submit" className="btn btn-primary" style={{ padding: '0 20px' }}>
                      Enviar
                    </button>
                  </form>
                )}
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                {isManager && !selectedTask.deletedAt && selectedTask.status !== 'archived' && (
                  <button 
                    onClick={(e) => handleDeleteTask(selectedTask.id, e)} 
                    className="btn btn-danger" 
                    style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  >
                    <Trash2 size={14} />
                    <span>Excluir Tarefa</span>
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {canEditTask(selectedTask) && selectedTask.status !== 'archived' && (
                  <button 
                    onClick={(e) => { setIsDetailModalOpen(false); handleOpenEditModal(selectedTask, e); }}
                    className="btn btn-secondary"
                    style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  >
                    <Edit3 size={14} />
                    <span>Editar</span>
                  </button>
                )}
                <button onClick={() => setIsDetailModalOpen(false)} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente do Card de Tarefa
const TaskCard = ({ task, departments, users, onClick, onMove, onEdit, onDelete, isManager, canEdit = false }) => {
  const dept = departments.find(d => d.id === task.departmentId);
  const workers = users.filter(u => task.assignedToIds?.includes(u.id));
  
  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'high': return 'badge-high';
      case 'medium': return 'badge-medium';
      case 'low': return 'badge-low';
      default: return 'badge-low';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      case 'low': return 'Baixa';
      default: return 'Baixa';
    }
  };

  return (
    <div className={`task-card ${task.deletedAt ? 'task-card-deleted' : ''}`} onClick={onClick}>
      <div className="task-card-header">
        <div style={{ display: 'flex', gap: '6px' }}>
          <span className={`badge ${getPriorityBadgeClass(task.priority)}`}>
            {getPriorityLabel(task.priority)}
          </span>
          {task.deletedAt && (
            <span className="badge badge-high">Excluída</span>
          )}
        </div>
        
        {/* Botão Editar: visível para gerente e para quem é dono/atribuído */}
        <div style={{ display: 'flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
          {canEdit && !task.deletedAt && (
            <button onClick={onEdit} className="btn-icon" style={{ padding: '4px' }} title="Editar Tarefa">
              <Edit3 size={12} />
            </button>
          )}
          {/* Botão Excluir: apenas gerente */}
          {isManager && !task.deletedAt && (
            <button onClick={onDelete} className="btn-icon" style={{ padding: '4px', color: 'var(--danger)' }} title="Excluir Tarefa">
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      <div>
        <h4 className="task-card-title">{task.title}</h4>
        <p className="task-card-description">{task.description}</p>
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {dept && (
          <span style={{ 
            fontSize: '0.7rem', 
            background: 'var(--border-color)', 
            padding: '2px 6px', 
            borderRadius: '4px',
            color: 'var(--text-secondary)'
          }}>
            {dept.name}
          </span>
        )}
      </div>

      <div className="task-card-footer">
        <div className="task-card-user" style={{ display: 'flex', position: 'relative' }}>
          {workers.slice(0, 3).map((w, idx) => (
            <div key={w.id} className="avatar-circle" style={{ width: '18px', height: '18px', fontSize: '0.6rem', marginLeft: idx > 0 ? '-6px' : '0', border: '1px solid var(--bg-card)' }} title={w.name}>
              {w.name.charAt(0).toUpperCase()}
            </div>
          ))}
          {(!task.assignedToIds || task.assignedToIds.length === 0) && (
            <div className="avatar-circle" style={{ width: '18px', height: '18px', fontSize: '0.6rem' }}>?</div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {task.comments?.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--text-muted)' }} title={`${task.comments.length} comentários`}>
              <MessageSquare size={12} />
              <span style={{ fontSize: '0.75rem' }}>{task.comments.length}</span>
            </div>
          )}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }} title={`Vencimento: ${task.dueDate.split('-').reverse().join('/')}`}>
            <Calendar size={12} />
            <span>{task.dueDate.split('-').slice(1).reverse().join('/')}</span>
          </div>
        </div>
      </div>

      {/* Botões Rápidos de Fluxo (facilita muito no celular/tablet) */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          borderTop: '1px solid var(--border-color)', 
          paddingTop: '8px', 
          marginTop: '4px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {task.status !== 'todo' ? (
          <button 
            onClick={() => onMove(task.status === 'done' ? 'doing' : 'todo')} 
            className="btn btn-secondary" 
            style={{ padding: '2px 8px', fontSize: '0.65rem', borderRadius: '4px' }}
          >
            ← Voltar
          </button>
        ) : <div />}

        {task.status !== 'done' ? (
          <button 
            onClick={() => onMove(task.status === 'todo' ? 'doing' : 'done')} 
            className="btn btn-primary" 
            style={{ padding: '2px 8px', fontSize: '0.65rem', borderRadius: '4px' }}
          >
            {task.status === 'todo' ? 'Iniciar' : 'Concluir'} →
          </button>
        ) : <div />}
      </div>
    </div>
  );
};

const EmptyColumnState = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '30px 10px',
    color: 'var(--text-muted)',
    border: '2px dashed var(--border-color)',
    borderRadius: '12px',
    fontSize: '0.85rem',
    textAlign: 'center',
    marginTop: '10px'
  }}>
    <Inbox size={24} style={{ marginBottom: '8px', opacity: 0.4 }} />
    <span>Nenhuma tarefa aqui</span>
  </div>
);

export default Tasks;
