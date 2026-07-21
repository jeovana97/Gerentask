import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Calendar, ShieldAlert, Bell, Check, Info, AlertTriangle, LogOut, User } from 'lucide-react';
import ProfileModal from './ProfileModal';

const Header = ({ activePage, setActivePage }) => {
  const { user, logout } = useAuth();
  const { departments, notifications, markNotificationAsRead, allTasks, setFocusedTaskId, jobTitles } = useData();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const dropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
    };

    if (isDropdownOpen || isProfileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen, isProfileDropdownOpen]);

  const handleNotificationClick = (notif) => {
    if (!notif.read) {
      markNotificationAsRead(notif.id);
    }
    
    if (notif.taskId) {
      const task = allTasks.find(t => t.id === notif.taskId);
      if (setActivePage) {
        if (task?.isPersonal) {
          setActivePage('personal-tasks');
        } else {
          setActivePage('tasks');
        }
      }
      setFocusedTaskId(notif.taskId);
    }
    setIsDropdownOpen(false);
  };

  if (!user) return null;

  const userDept = departments.find(d => d.id === user.departmentId);
  const userJobTitle = jobTitles?.find(j => j.id === user.jobTitleId);
  const myNotifications = (notifications || []).filter(n => {
    if (!n.userIds?.includes(user.id)) return false;
    if (n.read) return false; // Não mostra notificações lidas
    if (n.taskId) {
      const task = allTasks.find(t => t.id === n.taskId);
      if (task && (task.status === 'done' || task.status === 'archived' || task.deletedAt)) {
        return false; // Não mostra notificação se a tarefa já foi finalizada
      }
    }
    return true;
  });
  const unreadCount = myNotifications.filter(n => !n.read).length;

  const getPageTitle = () => {
    switch (activePage) {
      case 'dashboard':
        return 'Painel Gerencial';
      case 'tasks':
        return 'Quadro de Tarefas';
      case 'personal-tasks':
        return 'Minhas Tarefas Próprias';
      case 'departments':
        return 'Gerenciamento de Departamentos';
      case 'team':
        return 'Membros da Equipe';
      default:
        return 'Dashboard';
    }
  };

  const getFormattedDate = () => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('pt-BR', options);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleReadNotification = (id) => {
    markNotificationAsRead(id);
    // Não fecha o dropdown para que ele possa ler várias de uma vez
  };

  return (
    <header 
      style={{
        padding: '16px 32px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-card)',
        backdropFilter: 'var(--glass-blur)',
        zIndex: 100, // aumentado z-index
        position: 'sticky',
        top: 0
      }}
    >
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
          {getPageTitle()}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
          {user.photo ? (
            <img src={user.photo} alt={user.name} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div className="avatar-circle" style={{ width: '24px', height: '24px', fontSize: '0.75rem' }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Olá, <strong style={{ color: 'var(--text-secondary)' }}>{user.name}</strong>
          </span>
          {userDept && (
            <>
              <span style={{ color: 'var(--border-color)' }}>•</span>
              <span className="badge badge-doing" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                {userDept.name}
              </span>
            </>
          )}
          {userJobTitle && (
            <>
              <span style={{ color: 'var(--border-color)' }}>•</span>
              <span className="badge badge-done" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                {userJobTitle.name}
              </span>
            </>
          )}
          {user.role === 'manager' && (
            <>
              <span style={{ color: 'var(--border-color)' }}>•</span>
              <span className="badge badge-medium" style={{ fontSize: '0.65rem', padding: '2px 8px', background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-primary)' }}>
                Nível: Administrador
              </span>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Dropdown de Notificações */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <div 
            onClick={toggleDropdown}
            style={{ 
              position: 'relative', 
              cursor: 'pointer', 
              padding: '8px', 
              borderRadius: '50%',
              background: isDropdownOpen ? 'rgba(255,255,255,0.05)' : 'transparent',
              transition: 'background 0.2s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <Bell size={20} style={{ color: unreadCount > 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '4px',
                right: '6px',
                background: 'var(--danger)',
                color: '#fff',
                fontSize: '0.6rem',
                fontWeight: 'bold',
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid var(--bg-card)'
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          
          {/* Painel Flutuante (Dropdown) */}
          {isDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: '45px',
              right: '0',
              width: '320px',
              maxHeight: '400px',
              backgroundColor: 'var(--bg-solid-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              zIndex: 101
            }}>
              <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)' }}>Notificações</h4>
                {unreadCount > 0 && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', cursor: 'pointer' }} onClick={() => {
                    myNotifications.filter(n => !n.read).forEach(n => markNotificationAsRead(n.id));
                  }}>
                    Marcar todas lidas
                  </span>
                )}
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {myNotifications.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Info size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    <p style={{ fontSize: '0.85rem' }}>Nenhuma notificação por enquanto.</p>
                  </div>
                ) : (
                  myNotifications.map((notif) => {
                    const isPosicionamento = notif.title && notif.title.includes('Posicionamento');
                    const badgeBg = isPosicionamento ? 'var(--warning)' : 'var(--danger)';
                    const badgeText = isPosicionamento ? 'ATENÇÃO' : 'URGENTE';
                    const iconColor = isPosicionamento ? 'var(--warning)' : 'var(--danger)';
                    const circleBg = isPosicionamento ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)';

                    return (
                    <div 
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      style={{ 
                        padding: '12px 16px', 
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        background: notif.read ? 'transparent' : 'rgba(139, 92, 246, 0.05)',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'flex-start',
                        transition: 'background 0.2s ease',
                        cursor: notif.taskId ? 'pointer' : 'default'
                      }}
                    >
                      <div style={{ 
                        minWidth: '36px', height: '36px', borderRadius: '50%', 
                        background: notif.priority ? circleBg : (notif.read ? 'rgba(255,255,255,0.05)' : 'rgba(139, 92, 246, 0.15)'),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: notif.priority ? iconColor : (notif.read ? 'var(--text-muted)' : 'var(--accent-primary)')
                      }}>
                        {notif.priority ? <AlertTriangle size={16} /> : <Bell size={16} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h5 style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: notif.priority && !notif.read ? iconColor : (notif.read ? 'var(--text-secondary)' : 'var(--text-primary)'), fontWeight: notif.read ? '500' : '600' }}>
                          {notif.priority && <span style={{ marginRight: '6px', fontSize: '0.7rem', padding: '2px 4px', background: badgeBg, color: '#000', fontWeight: 'bold', borderRadius: '4px' }}>{badgeText}</span>}
                          {notif.title}
                        </h5>
                        <p style={{ margin: '0 0 6px 0', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                          {notif.message}
                        </p>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', opacity: 0.7 }}>
                          {new Date(notif.createdAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      {!notif.read && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleReadNotification(notif.id); }}
                          title="Marcar como lida"
                          style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', padding: '4px', borderRadius: '50%' }}
                        >
                          <Check size={16} />
                        </button>
                      )}
                    </div>
                  );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Data Atual */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          <Calendar size={16} style={{ color: 'var(--accent-primary)' }} />
          <span>{getFormattedDate()}</span>
        </div>

        {/* Meu Perfil Dropdown */}
        <div style={{ position: 'relative', marginLeft: '16px' }} ref={profileDropdownRef}>
          <button 
            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            className="btn btn-secondary"
            style={{ 
              padding: '6px 12px',
              color: 'var(--text-secondary)',
              borderColor: 'transparent',
              background: isProfileDropdownOpen ? 'rgba(255,255,255,0.05)' : 'var(--bg-card-hover)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              transition: 'background 0.2s'
            }}
            title="Meu Perfil"
          >
            <User size={16} />
            <span style={{ fontWeight: '500' }}>Meu Perfil</span>
          </button>

          {isProfileDropdownOpen && (
            <div className="animate-slide-up" style={{
              position: 'absolute',
              top: '40px',
              right: '0',
              width: '180px',
              backgroundColor: 'var(--bg-solid-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              zIndex: 101,
              padding: '4px'
            }}>
              <button
                onClick={() => {
                  setShowProfileModal(true);
                  setIsProfileDropdownOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  borderRadius: '6px',
                  width: '100%',
                  fontSize: '0.85rem'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <User size={16} />
                Editar Perfil
              </button>
              
              <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />

              <button
                onClick={logout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--danger)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  borderRadius: '6px',
                  width: '100%',
                  fontSize: '0.85rem'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <LogOut size={16} />
                Sair da Conta
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Renderiza o modal se estiver aberto */}
      {showProfileModal && (
        <ProfileModal onClose={() => setShowProfileModal(false)} />
      )}
    </header>
  );
};

export default Header;
