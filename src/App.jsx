import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ConfirmProvider } from './context/ConfirmContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Departments from './pages/Departments';
import Team from './pages/Team';
import History from './pages/History';
import Settings from './pages/Settings';
import NotificationCenter from './components/NotificationCenter';

// Lê a página atual a partir do hash da URL
const getPageFromHash = () => {
  const hash = window.location.hash.replace('#', '') || 'dashboard';
  return hash;
};

// Componente Interno que possui acesso ao useAuth()
const MainAppContent = () => {
  const { user, loading } = useAuth();
  const [activePage, setActivePageState] = useState(getPageFromHash);
  const [theme, setTheme] = useState('dark');

  // Navega para uma página e registra no histórico do browser
  const setActivePage = (page) => {
    if (page === activePage) return;
    window.history.pushState({ page }, '', `#${page}`);
    setActivePageState(page);
  };

  // Escuta o botão Voltar/Avançar do navegador
  useEffect(() => {
    const handlePopState = (e) => {
      const page = e.state?.page || getPageFromHash();
      setActivePageState(page);
    };
    window.addEventListener('popstate', handlePopState);

    // Registra a entrada inicial no histórico para que Voltar funcione da 1ª página
    window.history.replaceState({ page: activePage }, '', `#${activePage}`);

    return () => window.removeEventListener('popstate', handlePopState);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Inicializa o tema
  useEffect(() => {
    const savedTheme = localStorage.getItem('gt_theme') || 'dark';
    setTheme(savedTheme);
    if (savedTheme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('gt_theme', newTheme);
    if (newTheme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  };

  // Se o usuário mudar de cargo ou deslogar, reseta a página padrão
  useEffect(() => {
    setActivePage('dashboard');
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-dark)',
        color: 'var(--text-primary)',
        fontSize: '1.2rem',
        fontWeight: '500'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid var(--border-color)',
            borderTopColor: 'var(--accent-primary)',
            borderRadius: '50%',
            animation: 'pulse 1s infinite alternate',
            margin: '0 auto 16px'
          }}></div>
          Carregando Gerentask...
        </div>
      </div>
    );
  }

  // Se não estiver logado, exibe tela de login
  if (!user) {
    return <Login />;
  }

  // Renderiza a página ativa
  const renderActivePage = () => {
    // Segurança: se for funcionário tentando acessar páginas de gerente
    const isManager = user.role === 'manager' || user.role === 'master';

    switch (activePage) {
      case 'dashboard':
        return <Dashboard setActivePage={setActivePage} />;
      case 'tasks':
        return <Tasks />;
      case 'personal-tasks':
        return <Tasks isPersonalOnly={true} />;
      case 'departments':
        return isManager ? <Departments /> : <Dashboard setActivePage={setActivePage} />;
      case 'team':
        return isManager ? <Team /> : <Dashboard setActivePage={setActivePage} />;
      case 'history':
        return isManager ? <History /> : <Dashboard setActivePage={setActivePage} />;
      case 'settings':
        return isManager ? <Settings /> : <Dashboard setActivePage={setActivePage} />;
      default:
        return <Dashboard setActivePage={setActivePage} />;
    }
  };

  return (
    <div className="app-container">
      {/* Menu Lateral */}
      <Sidebar 
        activePage={activePage} 
        setActivePage={setActivePage} 
        theme={theme}
        toggleTheme={toggleTheme}
      />
      
      {/* Conteúdo Principal */}
      <div className="main-content">
        <Header activePage={activePage} setActivePage={setActivePage} />
        <main style={{ flex: 1 }}>
          {renderActivePage()}
        </main>
      </div>

      {/* Central de Notificações */}
      <NotificationCenter setActivePage={setActivePage} />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <ConfirmProvider>
          <MainAppContent />
        </ConfirmProvider>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
