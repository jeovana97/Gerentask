import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Bell, X, Calendar, ArrowRight } from 'lucide-react';

// Função para sintetizar um som premium de notificação usando a Web Audio API
const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    
    // Primeiro tom (agudo e suave)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    gain1.gain.setValueAtTime(0.08, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    // Segundo tom (harmônico)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, ctx.currentTime + 0.08); // G5
    gain2.gain.setValueAtTime(0.08, ctx.currentTime + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.35);
    
    osc2.start(ctx.currentTime + 0.08);
    osc2.stop(ctx.currentTime + 0.5);
  } catch (err) {
    console.warn('Bloqueado pela política de áudio do navegador ou erro de inicialização:', err);
  }
};

const NotificationCenter = ({ setActivePage }) => {
  const { user } = useAuth();
  const { tasks, allTasks, departments, setFocusedTaskId, notifications } = useData();
  const [toasts, setToasts] = useState([]);
  const isInitialized = useRef(false);
  const isNotifInitialized = useRef(false);

  // Monitora a chegada de novas tarefas atribuídas ao usuário logado
  useEffect(() => {
    if (!user) {
      isInitialized.current = false;
      return;
    }

    const storageKey = `gt_notified_ids_${user.id}`;
    
    // Filtra as tarefas que devem notificar o usuário atual (Popup/Toast)
    const relevantTasks = tasks.filter(t => {
      // Ignora tarefas concluídas, arquivadas, excluídas ou JÁ INICIADAS (doing)
      if (t.status === 'done' || t.status === 'archived' || t.status === 'doing' || t.deletedAt) return false;
      
      // 1. Tarefa atribuída a ele ou em cópia (e não criada por ele mesmo)
      const isAssigned = (t.assignedToIds?.includes(user.id) || t.ccIds?.includes(user.id)) && t.createdById !== user.id;
      
      // 2. Tarefa pendente de aprovação (se for gerente e não criada por ele mesmo)
      const isPending = user.role === 'manager' && t.approvalStatus === 'pending' && t.createdById !== user.id;
      
      return isAssigned || isPending;
    });
    
    const currentIds = relevantTasks.map(t => t.id);

    const rawKnownIds = localStorage.getItem(storageKey);

    if (!isInitialized.current) {
      if (!rawKnownIds) {
        // Inicializa silenciosamente com os IDs atuais para não disparar spam de notificações antigas
        localStorage.setItem(storageKey, JSON.stringify(currentIds));
      }
      isInitialized.current = true;
      return;
    }

    const knownIds = JSON.parse(rawKnownIds || '[]');
    
    // Filtra tarefas novas que o usuário ainda não conhecia (não estavam no localStorage)
    const newTasks = relevantTasks.filter(t => !knownIds.includes(t.id));

    if (newTasks.length > 0) {
      // Toca áudio e adiciona à fila de Toasts
      playNotificationSound();
      newTasks.forEach(task => {
        addToast(task);
      });

      // Mantém a sincronia no localStorage garantindo que nunca "esqueça" as antigas
      const updatedKnownIds = Array.from(new Set([...knownIds, ...currentIds]));
      localStorage.setItem(storageKey, JSON.stringify(updatedKnownIds));
    } else if (tasks.length > 0) {
      const updatedKnownIds = Array.from(new Set([...knownIds, ...currentIds]));
      localStorage.setItem(storageKey, JSON.stringify(updatedKnownIds));
    }
  }, [tasks, user]);

  // Monitora atualizações nas notificações do sistema (comentários, alertas, etc)
  useEffect(() => {
    if (!user || !notifications) {
      isNotifInitialized.current = false;
      return;
    }
    
    const notifStorageKey = `gt_notified_sys_${user.id}`;
    
    const myNotifications = notifications.filter(n => n.userIds?.includes(user.id) && !n.read);
    const currentNotifIds = myNotifications.map(n => n.id);
    const rawKnownNotifs = localStorage.getItem(notifStorageKey);

    if (!isNotifInitialized.current) {
      if (!rawKnownNotifs) {
        localStorage.setItem(notifStorageKey, JSON.stringify(currentNotifIds));
      }
      isNotifInitialized.current = true;
      return;
    }

    const knownNotifs = JSON.parse(rawKnownNotifs || '[]');
    const newNotifs = myNotifications.filter(n => !knownNotifs.includes(n.id));

    if (newNotifs.length > 0) {
      playNotificationSound();
      newNotifs.forEach(notif => {
        addSysToast(notif);
      });
      const updatedKnownNotifs = Array.from(new Set([...knownNotifs, ...currentNotifIds]));
      localStorage.setItem(notifStorageKey, JSON.stringify(updatedKnownNotifs));
    } else if (notifications.length > 0) {
      const updatedKnownNotifs = Array.from(new Set([...knownNotifs, ...currentNotifIds]));
      localStorage.setItem(notifStorageKey, JSON.stringify(updatedKnownNotifs));
    }
  }, [notifications, user]);

  const addToast = (task) => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const dept = departments.find(d => d.id === task.departmentId)?.name || 'Geral';
    
    const newToast = {
      id,
      taskId: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      dept,
      dueDate: task.dueDate,
      approvalStatus: task.approvalStatus,
      isExiting: false
    };

    setToasts(prev => [...prev, newToast]);

    // Remove automaticamente após 6 segundos
    setTimeout(() => {
      removeToast(id);
    }, 6000);
  };

  const addSysToast = (notif) => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const newToast = {
      id,
      taskId: notif.taskId,
      title: notif.title,
      description: notif.message,
      priority: notif.priority ? 'high' : 'medium',
      dept: 'Atualização',
      isUpdate: true,
      isExiting: false
    };

    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, 6000);
  };

  const removeToast = (id) => {
    setToasts(prev => 
      prev.map(t => t.id === id ? { ...t, isExiting: true } : t)
    );

    // Tempo para rodar a animação de saída (fadeout/slideout) do CSS antes de remover do DOM
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  };

  const handleToastClick = (taskId) => {
    const task = allTasks.find(t => t.id === taskId);
    if (setActivePage) {
      if (task?.isPersonal) {
        setActivePage('personal-tasks');
      } else {
        setActivePage('tasks');
      }
    }
    setFocusedTaskId(taskId);
  };

  const handleToastNavigate = (taskId) => {
    const task = allTasks.find(t => t.id === taskId);
    if (setActivePage) {
      if (task?.isPersonal) {
        setActivePage('personal-tasks');
      } else {
        setActivePage('tasks');
      }
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

  if (!user || toasts.length === 0) return null;

  return (
    <div className="notification-container">
      {toasts.map(toast => (
        <div 
          key={toast.id} 
          className={`notification-toast toast-${toast.priority} ${toast.isExiting ? 'toast-exit' : ''}`}
          onClick={() => {
            handleToastClick(toast.taskId);
            removeToast(toast.id);
          }}
          style={{ cursor: 'pointer' }}
        >
          {/* Botão para fechar o Toast */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              removeToast(toast.id);
            }} 
            className="notification-toast-close"
            title="Fechar"
          >
            <X size={14} />
          </button>

          <div className="notification-toast-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: toast.priority === 'high' ? 'var(--danger)' : toast.priority === 'medium' ? 'var(--warning)' : 'var(--success)'
              }}></div>
              <span className="notification-toast-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Bell size={14} className="text-secondary" />
                {toast.isUpdate ? 'Tarefa Atualizada' : toast.approvalStatus === 'pending' ? 'Tarefa Pendente de Aprovação' : 'Nova Tarefa Recebida!'}
              </span>
            </div>
          </div>

          <div className="notification-toast-body">
            <h4 style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px', fontSize: '0.875rem' }}>
              {toast.title}
            </h4>
            <p style={{ 
              fontSize: '0.8rem', 
              color: 'var(--text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '280px',
              marginBottom: '6px'
            }}>
              {toast.description}
            </p>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span className={`badge badge-${toast.priority}`} style={{ padding: '2px 6px', fontSize: '0.65rem' }}>
                Prioridade {getPriorityLabel(toast.priority)}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Setor: {toast.dept}
              </span>
            </div>
          </div>

          <div className="notification-toast-footer">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleToastNavigate(toast.taskId);
                removeToast(toast.id);
              }}
              className="btn btn-primary"
              style={{ 
                padding: '4px 10px', 
                fontSize: '0.75rem', 
                borderRadius: '6px',
                gap: '4px'
              }}
            >
              <span>Ver no Quadro</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationCenter;
