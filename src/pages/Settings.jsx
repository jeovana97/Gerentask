import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { Settings as SettingsIcon, Save } from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();
  const { settings, updateSetting } = useData();
  const confirm = useConfirm();
  const [defaultDueDates, setDefaultDueDates] = useState({
    high: 3,
    medium: 7,
    low: 14
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [dangerMessage, setDangerMessage] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [modalError, setModalError] = useState('');

  // Load from Context
  useEffect(() => {
    if (settings && settings.defaultDueDates) {
      setDefaultDueDates(settings.defaultDueDates);
    }
  }, [settings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDefaultDueDates({
      ...defaultDueDates,
      [name]: parseInt(value, 10) || 0
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    await updateSetting('defaultDueDates', defaultDueDates);
    setSuccessMessage('Configurações salvas com sucesso!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleClearClick = () => {
    setShowPasswordModal(true);
    setPasswordInput('');
    setModalError('');
  };

  const handleConfirmClear = async () => {
    if (!passwordInput) return;

    setDangerMessage('');
    try {
      // 1. Validar a senha
      const validRes = await fetch('http://localhost:3000/api/settings/validate-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput })
      });
      const validData = await validRes.json();
      if (!validRes.ok) {
        setModalError(validData.error || 'Senha incorreta.');
        return;
      }
      setModalError('');

      // 2. Exibir confirmação nativa (se senha válida)
      if (!(await confirm('Tem certeza ABSOLUTA? Todos os usuários (exceto você), tarefas, departamentos e histórico serão APAGADOS.', true))) {
        setShowPasswordModal(false);
        return;
      }

      setShowPasswordModal(false);
      setIsClearing(true);

      // 3. Limpar de fato
      const res = await fetch('http://localhost:3000/api/settings/clear-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput, currentUserId: user.id })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao limpar a base.');
      }

      setDangerMessage('Base de dados apagada com sucesso. Recarregando...');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      confirm.alert(err.message);
    } finally {
      setIsClearing(false);
    }
  };

  if (!user || !['manager', 'master'].includes(user.role)) {
    return <div style={{ padding: '24px', color: 'var(--text-primary)' }}>Acesso negado.</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <SettingsIcon size={24} className="text-primary" />
            Configurações do Sistema
          </h2>
          <p className="page-subtitle">Ajuste os parâmetros padrão para o funcionamento do Gerentask.</p>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '24px', maxWidth: '600px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>
          Prazos Padrão (Dias Úteis)
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Defina quantos dias úteis (ignorando sábados e domingos) o sistema deve sugerir automaticamente como data limite ao criar uma nova tarefa, com base em sua prioridade.
        </p>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '16px' }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Alta Prioridade:</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="number"
                name="high"
                min="0"
                value={defaultDueDates.high}
                onChange={handleChange}
                className="form-input"
                style={{ width: '100px' }}
                required
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>dias</span>
            </div>
          </div>

          <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '16px' }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Média Prioridade:</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="number"
                name="medium"
                min="0"
                value={defaultDueDates.medium}
                onChange={handleChange}
                className="form-input"
                style={{ width: '100px' }}
                required
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>dias</span>
            </div>
          </div>

          <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '16px' }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Baixa Prioridade:</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="number"
                name="low"
                min="0"
                value={defaultDueDates.low}
                onChange={handleChange}
                className="form-input"
                style={{ width: '100px' }}
                required
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>dias</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px' }}>
              <Save size={16} />
              <span>Salvar Alterações</span>
            </button>
            {successMessage && (
              <span style={{ color: 'var(--success)', fontSize: '0.9rem', fontWeight: '500' }}>
                {successMessage}
              </span>
            )}
          </div>
        </form>
      </div>

      {user.role === 'master' && (
        <div className="glass-card" style={{ padding: '24px', maxWidth: '600px', marginTop: '24px', border: '1px solid var(--danger)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--danger)', marginBottom: '16px' }}>
          Zona de Perigo
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
          As ações abaixo são irreversíveis. A limpeza da base de dados apaga todas as tarefas, histórico, departamentos e usuários do sistema (preservando apenas a conta com a qual você está logado agora).
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ padding: '10px 24px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderColor: 'var(--danger)' }}
            onClick={handleClearClick}
            disabled={isClearing}
          >
            {isClearing ? 'Limpando...' : 'Limpar Base de Dados'}
          </button>
          {dangerMessage && (
            <span style={{ color: 'var(--danger)', fontSize: '0.9rem', fontWeight: '500' }}>
              {dangerMessage}
            </span>
          )}
        </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: 'var(--danger)' }}>Confirmar Limpeza</h2>
              <button className="modal-close" onClick={() => setShowPasswordModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                ZONA DE PERIGO: Digite a senha de administrador para confirmar que deseja apagar toda a base de dados.
              </p>
              <input
                type="password"
                className="form-input"
                placeholder="Senha do Gerente"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                autoFocus
              />
              {modalError && (
                <p style={{ color: 'var(--danger)', marginTop: '8px', fontSize: '0.9rem' }}>{modalError}</p>
              )}
            </div>
            <div className="modal-footer" style={{ marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={() => setShowPasswordModal(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleConfirmClear} style={{ background: 'var(--danger)' }}>
                Limpar Banco de Dados
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
