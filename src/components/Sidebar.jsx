import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  CheckSquare, 
  UserCheck,
  FolderOpen, 
  Users, 
  Sun, 
  Moon,
  Clock,
  Settings as SettingsIcon
} from 'lucide-react';

const Sidebar = ({ activePage, setActivePage, theme, toggleTheme }) => {
  const { user } = useAuth();

  if (!user) return null;

  const isManager = user.role === 'manager' || user.role === 'master';

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, visible: true },
    { id: 'tasks', name: 'Tarefas', icon: CheckSquare, visible: true },
    { id: 'personal-tasks', name: 'Tarefas Próprias', icon: UserCheck, visible: true },
    { id: 'departments', name: 'Departamentos', icon: FolderOpen, visible: isManager },
    { id: 'team', name: 'Membros da Equipe', icon: Users, visible: isManager },
    { id: 'history', name: 'Histórico', icon: Clock, visible: isManager },
    { id: 'settings', name: 'Configurações', icon: SettingsIcon, visible: isManager },
  ];

  return (
    <aside 
      className="glass-panel" 
      style={{
        width: '260px',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-sidebar)',
        padding: '24px 16px',
        position: 'sticky',
        top: 0
      }}
    >
      {/* Header/Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', paddingLeft: '8px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '1.2rem',
          boxShadow: '0 4px 10px rgba(139, 92, 246, 0.4)'
        }}>
          G
        </div>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, letterSpacing: '0.5px' }}>
            Geren<span style={{ color: 'var(--accent-primary)' }}>task</span>
          </h1>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '-2px' }}>
            Portal Corporativo
          </span>
        </div>
      </div>

      {/* Navegação */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        {menuItems.filter(item => item.visible).map(item => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className="btn"
              style={{
                justifyContent: 'flex-start',
                padding: '12px 16px',
                width: '100%',
                background: isActive ? 'var(--accent-primary)' : 'transparent',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                boxShadow: isActive ? '0 4px 12px rgba(139, 92, 246, 0.25)' : 'none'
              }}
            >
              <Icon size={18} />
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* Rodapé da Sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
        {/* Toggle de Tema */}
        <button 
          onClick={toggleTheme}
          className="btn btn-secondary" 
          style={{ justifyContent: 'center', padding: '10px' }}
          title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
        >
          {theme === 'dark' ? (
            <>
              <Sun size={18} style={{ color: '#fbbf24' }} />
              <span>Tema Claro</span>
            </>
          ) : (
            <>
              <Moon size={18} />
              <span>Tema Escuro</span>
            </>
          )}
        </button>

        {/* Informações do Usuário */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px' }}>
          <div className="avatar-circle">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)' }}>
              {user.name}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {user.role === 'manager' ? 'Gerente' : 'Funcionário'}
            </div>
          </div>
        </div>

      </div>
    </aside>
  );
};

export default Sidebar;
