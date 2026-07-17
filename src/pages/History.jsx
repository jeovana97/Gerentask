import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Clock, ShieldAlert, Trash2, Calendar, User as UserIcon, Edit3, ArrowRight, PlusCircle } from 'lucide-react';

const History = () => {
  const { user } = useAuth();
  const { history, updateHistory, insertionHistory } = useData();
  const [activeTab, setActiveTab] = useState('deletions'); // 'deletions' | 'updates' | 'insertions'

  // Segurança de perfil
  if (!['manager', 'master'].includes(user.role)) {
    return (
      <div className="page-container" style={{ textAlign: 'center', marginTop: '80px' }}>
        <ShieldAlert size={48} style={{ color: 'var(--danger)', marginBottom: '16px' }} />
        <h3>Acesso Restrito</h3>
        <p style={{ color: 'var(--text-secondary)' }}>Esta página só pode ser visualizada por Gerentes do sistema.</p>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in">
      {/* Header interno */}
      <div className="flex-between" style={{ marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>
            Histórico de Auditoria
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Registro completo com exclusões e alterações feitas no sistema.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('deletions')}
          className={`btn ${activeTab === 'deletions' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Trash2 size={18} />
          Exclusões
        </button>
        <button
          onClick={() => setActiveTab('updates')}
          className={`btn ${activeTab === 'updates' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Edit3 size={18} />
          Alterações
        </button>
        <button
          onClick={() => setActiveTab('insertions')}
          className={`btn ${activeTab === 'insertions' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <PlusCircle size={18} />
          Inserções
        </button>
      </div>

      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', color: 'var(--text-primary)' }}>
          <Clock size={20} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>Registro de Atividades</h3>
        </div>

        {activeTab === 'insertions' ? (
          (!insertionHistory || insertionHistory.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <PlusCircle size={40} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <p>Nenhum novo cadastro foi registrado no sistema até agora.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {insertionHistory.map(item => (
                <div 
                  key={item.id} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '16px', 
                    background: 'rgba(255,255,255,0.02)', 
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      color: 'var(--success)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <PlusCircle size={18} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ 
                          fontSize: '0.7rem', 
                          padding: '2px 6px', 
                          background: 'var(--border-color)', 
                          borderRadius: '4px',
                          fontWeight: '500'
                        }}>
                          {item.type}
                        </span>
                        {item.entityName}
                      </h4>
                      <p style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                        <UserIcon size={12} />
                        Cadastrado por: <strong>{item.createdBy}</strong>
                      </p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <Calendar size={14} />
                    <span>{new Date(item.date).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : activeTab === 'deletions' ? (
          (!history || history.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <Trash2 size={40} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <p>Nenhuma exclusão foi registrada no sistema até agora.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {history.map(item => (
                <div 
                  key={item.id} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '16px', 
                    background: 'rgba(255,255,255,0.02)', 
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: 'var(--danger)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Trash2 size={18} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ 
                          fontSize: '0.7rem', 
                          padding: '2px 6px', 
                          background: 'var(--border-color)', 
                          borderRadius: '4px',
                          fontWeight: '500'
                        }}>
                          {item.type}
                        </span>
                        {item.name}
                      </h4>
                      <p style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                        <UserIcon size={12} />
                        Excluído por: <strong>{item.deletedBy}</strong>
                      </p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <Calendar size={14} />
                    <span>{new Date(item.date).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          (!updateHistory || updateHistory.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <Edit3 size={40} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <p>Nenhuma alteração foi registrada no sistema até agora.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {updateHistory.map(item => (
                <div 
                  key={item.id} 
                  style={{ 
                    padding: '16px', 
                    background: 'rgba(255,255,255,0.02)', 
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        color: 'var(--accent-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Edit3 size={18} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ 
                            fontSize: '0.7rem', 
                            padding: '2px 6px', 
                            background: 'var(--border-color)', 
                            borderRadius: '4px',
                            fontWeight: '500'
                          }}>
                            {item.type}
                          </span>
                          {item.entityName}
                        </h4>
                        <p style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                          <UserIcon size={12} />
                          Alterado por: <strong>{item.changedBy}</strong>
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <Calendar size={14} />
                      <span>{new Date(item.date).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                  
                  <div style={{ background: 'var(--bg-dark)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', marginTop: '12px' }}>
                    <h5 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Campos Alterados:</h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {Object.keys(item.changes).map(field => {
                        const change = item.changes[field];
                        return (
                          <div key={field} style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{field}:</span>
                            <span style={{ color: 'var(--danger)', textDecoration: 'line-through' }}>
                              {typeof change.from === 'object' ? JSON.stringify(change.from) : String(change.from || 'Vazio')}
                            </span>
                            <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                            <span style={{ color: 'var(--success)' }}>
                              {typeof change.to === 'object' ? JSON.stringify(change.to) : String(change.to || 'Vazio')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default History;
