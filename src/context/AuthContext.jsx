import React, { createContext, useContext, useState, useEffect } from 'react';
import { getDBData, api } from '../services/db';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verificationCode, setVerificationCode] = useState(null);
  const [pendingUser, setPendingUser] = useState(null); // Armazena dados de cadastro pendentes de verificação

  useEffect(() => {
    // Carrega o usuário atual da sessão
    const savedUser = localStorage.getItem('gt_current_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const users = await getDBData('gt_users');
    const cleanEmail = email.trim().toLowerCase();
    const foundUser = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!foundUser) {
      throw new Error('E-mail não cadastrado.');
    }

    if (foundUser.password !== password) {
      throw new Error('Senha incorreta.');
    }

    if (!foundUser.verified) {
      // Se não estiver verificado, envia para verificação
      setPendingUser(foundUser);
      sendVerificationCode(foundUser.email);
      return { status: 'verification_pending', email: foundUser.email };
    }

    if (foundUser.approved === false) {
      throw new Error('Seu cadastro está aguardando a aprovação do gerente do departamento.');
    }

    localStorage.setItem('gt_current_user', JSON.stringify(foundUser));
    setUser(foundUser);
    return { status: 'logged_in', user: foundUser };
  };

  const logout = () => {
    localStorage.removeItem('gt_current_user');
    setUser(null);
  };

  const register = async (name, email, password, role = 'employee', departmentId = '') => {
    const users = await getDBData('gt_users');
    const cleanEmail = email.trim().toLowerCase();
    const emailExists = users.some(u => u.email.toLowerCase() === cleanEmail);

    if (emailExists) {
      throw new Error('Este e-mail já está cadastrado.');
    }

    const newUser = {
      id: 'u_' + Date.now(),
      name,
      email: cleanEmail,
      password,
      role,
      departmentId: departmentId || '1', // Tecnologia como padrão se vazio
      verified: false, // Precisa validar o e-mail primeiro
      approved: false // Cadastro público inicia pendente de aprovação
    };

    setPendingUser(newUser);
    sendVerificationCode(cleanEmail);
    return newUser;
  };

  const sendVerificationCode = (email) => {
    // Gera um código de 6 dígitos aleatório
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setVerificationCode(code);
    
    // Simula envio mostrando um alerta no console/interface
    console.log(`[SIMULAÇÃO] Código de verificação para ${email}: ${code}`);
    alert(`[SIMULAÇÃO DE E-MAIL]

Enviamos um e-mail para ${email} com o código de validação:

👉  ${code}  👈

(Copie e digite na tela para continuar)`);
  };

  const verifyEmail = async (code) => {
    if (code !== verificationCode) {
      throw new Error('Código de verificação incorreto.');
    }

    if (!pendingUser) {
      throw new Error('Nenhuma conta pendente de validação encontrada.');
    }

    const users = await getDBData('gt_users');
    
    // Verifica se já existia na base de dados (caso de login sem verificação)
    const existingIndex = users.findIndex(u => u.email.toLowerCase() === pendingUser.email.toLowerCase());
    
    let updatedUser = { ...pendingUser, verified: true, approved: false };

    if (existingIndex > -1) {
      await api.put(`/users/${updatedUser.id}`, updatedUser);
    } else {
      await api.post('/users', updatedUser);
    }
    
    // Notificar gerentes se o cadastro precisa de aprovação
    if (updatedUser.approved === false) {
      const managersToNotify = users
        .filter(u => (u.role === 'manager' || u.role === 'master') && (u.departmentId === updatedUser.departmentId || u.role === 'master'))
        .map(u => u.id);
        
      if (managersToNotify.length > 0) {
        try {
          await api.post('/notifications', {
            title: 'Aprovação de Cadastro',
            message: `O funcionário ${updatedUser.name} (${updatedUser.email}) validou o e-mail e aguarda liberação de acesso.`,
            taskId: null,
            userIds: managersToNotify,
            priority: true
          });
        } catch (e) {
          console.error('Falha ao enviar notificação de novo cadastro', e);
        }
      }
    }
    
    // Limpar estados temporários
    setPendingUser(null);
    setVerificationCode(null);
    
    // Retorna o status de aprovação pendente para o componente de Login tratar na interface
    return { status: 'pending_approval', user: updatedUser };
  };

  const cancelVerification = () => {
    setPendingUser(null);
    setVerificationCode(null);
  };

  const updateCurrentUser = (newUserData) => {
    const updated = { ...user, ...newUserData };
    localStorage.setItem('gt_current_user', JSON.stringify(updated));
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, verifyEmail, cancelVerification, pendingUser, updateCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
