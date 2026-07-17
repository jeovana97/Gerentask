import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDBData } from '../services/db';
import { Mail, Lock, User, Briefcase, KeyRound, AlertCircle, ArrowRight } from 'lucide-react';

const Login = () => {
  const { login, register, verifyEmail, pendingUser, cancelVerification } = useAuth();
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Form de Login/Cadastro
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('employee');
  const [departmentId, setDepartmentId] = useState('');
  
  // Form de Código
  const [code, setCode] = useState('');
  
  // Erros e Mensagens
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    // Carrega departamentos para a seleção no cadastro
    const fetchDepartments = async () => {
      const data = await getDBData('gt_departments');
      setDepartments(data);
      if (data.length > 0) {
        setDepartmentId(data[0].id);
      }
    };
    fetchDepartments();
  }, []);

  useEffect(() => {
    // Se houver um usuário pendente de validação no contexto, exibe a tela de código
    if (pendingUser) {
      setIsVerifying(true);
    } else {
      setIsVerifying(false);
    }
  }, [pendingUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isVerifying) {
      // Validação do Código
      try {
        if (!code || code.length !== 6) {
          throw new Error('O código deve conter 6 dígitos.');
        }
        const res = await verifyEmail(code);
        if (res && res.status === 'pending_approval') {
          setSuccess('E-mail validado com sucesso! Seu cadastro foi enviado e aguarda a aprovação do gerente do departamento para liberação de acesso.');
          setIsVerifying(false);
          setIsRegistering(false);
        } else {
          setSuccess('E-mail validado com sucesso!');
        }
        setCode('');
      } catch (err) {
        setError(err.message);
      }
    } else if (isRegistering) {
      // Cadastro
      try {
        if (!name || !email || !password) {
          throw new Error('Por favor, preencha todos os campos.');
        }
        if (password.length < 3) {
          throw new Error('A senha deve ter pelo menos 3 caracteres.');
        }
        await register(name, email, password, role, departmentId);
        // O contexto ativa o pendingUser, que ativa a verificação de e-mail
        setSuccess('Cadastro pré-realizado! Por favor, insira o código de validação.');
      } catch (err) {
        setError(err.message);
      }
    } else {
      // Login
      try {
        if (!email || !password) {
          throw new Error('Preencha os campos de e-mail e senha.');
        }
        const res = await login(email, password);
        if (res.status === 'verification_pending') {
          setSuccess('Validação de e-mail pendente. Digite o código enviado.');
          setIsVerifying(true);
        }
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleBackToLogin = () => {
    setError('');
    setSuccess('');
    setIsRegistering(false);
    setIsVerifying(false);
    cancelVerification();
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'radial-gradient(ellipse at bottom, #1b2735 0%, var(--bg-dark) 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Círculos de Fundo com Blur para a estética premium */}
      <div style={{
        position: 'absolute',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: 'var(--accent-primary)',
        filter: 'blur(120px)',
        opacity: 0.15,
        top: '10%',
        left: '20%',
        zIndex: 0
      }}></div>
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'var(--accent-secondary)',
        filter: 'blur(150px)',
        opacity: 0.12,
        bottom: '10%',
        right: '20%',
        zIndex: 0
      }}></div>

      <div className="glass-card animate-slide-up" style={{
        width: '100%',
        maxWidth: '460px',
        padding: '40px',
        zIndex: 1,
        textAlign: 'center',
        position: 'relative'
      }}>
        {/* Logo */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '1.4rem',
            boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)'
          }}>
            G
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '700', margin: 0, letterSpacing: '0.5px' }}>
            Geren<span style={{ color: 'var(--accent-primary)' }}>task</span>
          </h2>
        </div>

        {/* Título Principal */}
        <h3 style={{ fontSize: '1.25rem', fontWeight: '500', marginBottom: '24px', color: 'var(--text-primary)' }}>
          {isVerifying ? 'Validação de E-mail' : isRegistering ? 'Criar Nova Conta' : 'Acesse a sua Conta'}
        </h3>

        {/* Mensagens de Feedback */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '8px',
            padding: '12px',
            color: 'var(--danger)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textAlign: 'left',
            marginBottom: '20px'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '8px',
            padding: '12px',
            color: 'var(--success)',
            fontSize: '0.85rem',
            textAlign: 'left',
            marginBottom: '20px'
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isVerifying ? (
            // Form de Verificação de E-mail
            <>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: '1.6' }}>
                Para sua segurança, enviamos um código numérico de validação para o e-mail: <br />
                <strong style={{ color: 'var(--text-primary)' }}>{pendingUser?.email}</strong>
              </p>
              
              <div className="form-group">
                <label className="form-label">Código de Verificação (6 dígitos)</label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    maxLength="6"
                    placeholder="Ex: 123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    className="form-input"
                    style={{ paddingLeft: '48px', letterSpacing: '4px', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}
                    required
                  />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
                  💡 Um popup foi exibido na sua tela com o código simulado. Caso não tenha visto, confira os logs do console do navegador (F12).
                </span>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
                Validar E-mail e Entrar
              </button>

              <button type="button" onClick={handleBackToLogin} className="btn btn-secondary" style={{ width: '100%' }}>
                Cancelar e Voltar
              </button>
            </>
          ) : (
            // Form de Login ou Cadastro
            <>
              {isRegistering && (
                <div className="form-group">
                  <label className="form-label">Nome Completo</label>
                  <div style={{ position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Seu nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: '48px' }}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Endereço de E-mail</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-muted)' }} />
                  <input
                    type="email"
                    placeholder="nome@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '48px' }}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Senha</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-muted)' }} />
                  <input
                    type="password"
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '48px' }}
                    required
                  />
                </div>
              </div>

              {isRegistering && (
                <>
                  <div className="form-group">
                    <label className="form-label">Perfil de Acesso</label>
                    <div style={{ position: 'relative' }}>
                      <Briefcase size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-muted)' }} />
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="form-select"
                        style={{ paddingLeft: '48px' }}
                      >
                        <option value="employee">Funcionário (Apenas executa tarefas)</option>
                        <option value="manager">Gerente (Gerencia painéis, setores e equipe)</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Departamento</label>
                    <select
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                      className="form-select"
                    >
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', marginTop: '8px' }}>
                <span>{isRegistering ? 'Criar Conta' : 'Entrar no Sistema'}</span>
                <ArrowRight size={16} />
              </button>

              <div style={{ marginTop: '16px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {isRegistering ? (
                  <span>
                    Já possui conta?{' '}
                    <button type="button" onClick={() => { setIsRegistering(false); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}>
                      Fazer Login
                    </button>
                  </span>
                ) : (
                  <span>
                    Novo no Gerentask?{' '}
                    <button type="button" onClick={() => { setIsRegistering(true); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}>
                      Cadastre-se
                    </button>
                  </span>
                )}
              </div>


            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default Login;
