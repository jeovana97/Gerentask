import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useConfirm } from '../context/ConfirmContext';
import { Plus, Edit, Trash2, X, Users, Mail, ShieldAlert, Award, UserCheck, Search } from 'lucide-react';

const Team = () => {
  const { user } = useAuth();
  const { 
    users, 
    allUsers,
    departments, 
    allDepartments,
    jobTitles,
    addJobTitle,
    deleteJobTitle,
    tasks, 
    addUser, 
    updateUser, 
    deleteUser 
  } = useData();
  const confirm = useConfirm();

  // Estados dos modais e forms
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [jobTitleName, setJobTitleName] = useState('');
  const [jobTitleAccess, setJobTitleAccess] = useState('employee');
  
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  const [memberRole, setMemberRole] = useState('employee');
  const [memberJobTitleId, setMemberJobTitleId] = useState('');
  const [memberDeptId, setMemberDeptId] = useState('');
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);

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

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setMemberName('');
    setMemberEmail('');
    setMemberPassword('123'); // Senha padrão simplificada
    setMemberRole('employee');
    setMemberJobTitleId(jobTitles[0]?.id || '');
    setMemberDeptId(departments[0]?.id || '');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (member) => {
    setIsEditing(true);
    setEditingId(member.id);
    setMemberName(member.name);
    setMemberEmail(member.email);
    setMemberPassword(member.password);
    setMemberRole(member.role);
    setMemberJobTitleId(member.jobTitleId || '');
    setMemberDeptId(member.departmentId);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!memberName.trim() || !memberEmail.trim() || !memberPassword) {
      confirm.alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const selectedJobTitle = jobTitles.find(jt => jt.id === memberJobTitleId);
    let finalRole = memberRole;
    if (selectedJobTitle && finalRole !== 'master') {
      finalRole = selectedJobTitle.accessLevel;
    }

    const userData = {
      name: memberName,
      email: memberEmail,
      password: memberPassword,
      role: finalRole,
      jobTitleId: memberJobTitleId || null,
      departmentId: memberDeptId
    };

    try {
      if (isEditing) {
        await updateUser(editingId, userData);
      } else {
        await addUser(userData);
      }
      setIsModalOpen(false);
    } catch (err) {
      confirm.alert(err.message);
    }
  };

  const handleDelete = async (memberId, name) => {
    if (memberId === user.id) {
      confirm.alert('Você não pode excluir o seu próprio perfil atual.');
      return;
    }

    const associatedTasks = tasks.filter(t => t.assignedToId === memberId).length;
    let confirmMsg = `Deseja realmente remover o colaborador "${name}" da equipe?`;
    if (associatedTasks > 0) {
      confirmMsg += `\n\nATENÇÃO: Este colaborador possui ${associatedTasks} tarefas atribuídas a ele. Elas ficarão sem responsável técnico.`;
    }

    if (await confirm(confirmMsg, true)) {
      try {
        await deleteUser(memberId);
      } catch (err) {
        confirm.alert(err.message);
      }
    }
  };

  // Filtragem da lista
  const baseUsersList = showDeleted ? allUsers : users;
  
  const filteredUsers = baseUsersList.filter(u => {
    // Ocultar usuários pendentes de aprovação da lista ativa principal se não for deletado
    if (!u.deletedAt && u.approved === false) {
      return false;
    }

    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = filterDept ? u.departmentId === filterDept : true;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="page-container animate-fade-in">
      {/* Header interno */}
      <div className="flex-between" style={{ marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>
            Membros da Equipe
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Cadastre, edite e acompanhe os níveis de acesso e verificação dos colaboradores.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setIsJobModalOpen(true)} className="btn btn-secondary">
            <span>Gerenciar Cargos</span>
          </button>
          <button onClick={handleOpenCreateModal} className="btn btn-primary">
            <Plus size={18} />
            <span>Adicionar Colaborador</span>
          </button>
        </div>
      </div>
      {/* SEÇÃO DE NOVAS SOLICITAÇÕES DE CADASTRO (Pendente de aprovação do gerente do setor) */}
      {(() => {
        const pendingUsers = users.filter(u => u.approved === false && (user.role === 'master' || u.departmentId === user.departmentId));
        if (pendingUsers.length === 0) return null;
        
        return (
          <div className="glass-card" style={{ padding: '24px', marginBottom: '28px', borderLeft: '4px solid var(--accent-primary)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserCheck size={18} style={{ color: 'var(--accent-primary)' }} />
              Solicitações de Acesso Pendentes ({pendingUsers.length})
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px', textAlign: 'left' }}>
              Estes profissionais se cadastraram no portal e aguardam liberação. Valide os dados e aprove ou recuse o acesso.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {pendingUsers.map(u => {
                const deptName = departments.find(d => d.id === u.departmentId)?.name || 'Outro';
                const uJobTitle = jobTitles.find(jt => jt.id === u.jobTitleId);
                const displayRolePending = u.role === 'master' ? 'Administrador' : (uJobTitle ? uJobTitle.name : (u.role === 'manager' ? 'Gerente' : 'Funcionário'));
                return (
                  <div 
                    key={u.id} 
                    className="glass-card" 
                    onClick={() => handleOpenEditModal(u)}
                    style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid var(--border-color)', cursor: 'pointer' }}
                  >
                    <div style={{ textAlign: 'left' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)' }}>{u.name}</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <Mail size={12} />
                        <span>{u.email}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                        <span className="badge badge-doing" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>{deptName}</span>
                        <span className="badge badge-low" style={{ fontSize: '0.65rem', padding: '2px 8px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                          Cargo: {displayRolePending}
                        </span>
                      </div>
                    </div>
  
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button 
                        onClick={async (e) => { e.stopPropagation(); try { await deleteUser(u.id); } catch (err) { confirm.alert(err.message); } }} 
                        className="btn btn-secondary" 
                        style={{ flex: 1, padding: '6px 12px', fontSize: '0.75rem', color: 'var(--danger)' }}
                      >
                        Recusar
                      </button>
                      <button 
                        onClick={async (e) => { e.stopPropagation(); try { await updateUser(u.id, { approved: true }); } catch (err) { confirm.alert(err.message); } }} 
                        className="btn btn-primary" 
                        style={{ flex: 1, padding: '6px 12px', fontSize: '0.75rem' }}
                      >
                        Aprovar Acesso
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
      {/* Barra de Filtros */}
      <div className="glass-card" style={{ padding: '16px', marginBottom: '28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '40px' }}
            />
          </div>

          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="form-select"
          >
            <option value="">Todos Departamentos</option>
            {allDepartments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <button
            onClick={() => setShowDeleted(!showDeleted)}
            className={`btn ${showDeleted ? 'btn-primary' : 'btn-secondary'}`}
          >
            {showDeleted ? 'Ocultar Excluídos' : 'Mostrar Excluídos'}
          </button>
        </div>
      </div>

      {/* Grid de Membros */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
        {filteredUsers.map(member => {
          const dept = departments.find(d => d.id === member.departmentId);
          const memberTasksCount = tasks.filter(t => t.assignedToId === member.id && t.status !== 'done').length;
          const memberJobTitle = jobTitles.find(jt => jt.id === member.jobTitleId);
          const displayRole = member.role === 'master' ? 'Administrador' : (memberJobTitle ? memberJobTitle.name : (member.role === 'manager' ? 'Gerente' : 'Funcionário'));

          return (
            <div key={member.id} className="glass-card animate-slide-up" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
              
              {/* Badge de Nível / Excluído */}
              <div style={{ position: 'absolute', top: '24px', right: '24px', display: 'flex', gap: '8px' }}>
                {member.deletedAt && (
                  <span className="badge badge-high" style={{ fontSize: '0.65rem' }}>
                    Excluído
                  </span>
                )}
                <span className={`badge ${member.role === 'master' ? 'badge-high' : (member.role === 'manager' ? 'badge-medium' : 'badge-doing')}`} style={{ fontSize: '0.65rem' }}>
                  {displayRole}
                </span>
              </div>

              {/* Informações Principais */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div className="avatar-circle" style={{ width: '48px', height: '48px', fontSize: '1.25rem' }}>
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {member.name}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <Mail size={12} />
                    {member.email}
                  </span>
                </div>
              </div>

              {/* Detalhes do Membro */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                padding: '12px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid var(--border-color)',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)'
              }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'block' }}>Setor</span>
                  <strong>{dept?.name || 'Sem Setor'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'block' }}>Status Conta</span>
                  {member.deletedAt ? (
                    <strong style={{ color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <X size={12} /> Excluída em {new Date(member.deletedAt).toLocaleDateString('pt-BR')}
                    </strong>
                  ) : (
                    <strong style={{ color: member.verified ? 'var(--success)' : 'var(--warning)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      {member.verified ? (
                        <>
                          <UserCheck size={12} /> Ativa / Validada
                        </>
                      ) : 'Aguardando Validação'}
                    </strong>
                  )}
                </div>
              </div>

              {/* Rodapé do Card com Ações */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'between', borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flex: 1 }}>
                  <strong>{memberTasksCount}</strong> tarefas pendentes
                </span>

                <div style={{ display: 'flex', gap: '6px' }}>
                  {!member.deletedAt && (
                    <button onClick={() => handleOpenEditModal(member)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                      <Edit size={12} />
                      <span>Editar</span>
                    </button>
                  )}
                  {member.id !== user.id && !member.deletedAt && member.role !== 'master' && (
                    <button onClick={() => handleDelete(member.id, member.name)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', color: 'var(--danger)' }}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* --- MODAL DE CRIAÇÃO / EDIÇÃO DE COLABORADOR --- */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                {isEditing ? 'Editar Dados da Equipe' : 'Cadastrar Novo Colaborador'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="btn-icon">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Nome Completo *</label>
                  <input
                    type="text"
                    placeholder="Ex: Roberto Carlos"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Endereço de E-mail *</label>
                  <input
                    type="email"
                    placeholder="roberto@empresa.com"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Senha Provisória *</label>
                  <input
                    type="password"
                    placeholder="Senha de acesso inicial"
                    value={memberPassword}
                    onChange={(e) => setMemberPassword(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Cargo</label>
                    {memberRole === 'master' ? (
                      <input type="text" className="form-input" value="Administrador do Sistema" disabled />
                    ) : (
                      <select
                        value={memberJobTitleId}
                        onChange={(e) => setMemberJobTitleId(e.target.value)}
                        className="form-select"
                        required
                      >
                        <option value="">Selecione um Cargo</option>
                        {jobTitles.map(jt => (
                          <option key={jt.id} value={jt.id}>{jt.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Departamento</label>
                    <select
                      value={memberDeptId}
                      onChange={(e) => setMemberDeptId(e.target.value)}
                      className="form-select"
                    >
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {isEditing ? 'Salvar Alterações' : 'Adicionar Membro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal de Gerenciar Cargos */}
      {isJobModalOpen && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 1100 }}>
          <div className="modal-content animate-slide-up" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={20} style={{ color: 'var(--accent-primary)' }} />
                Gerenciar Cargos
              </h3>
              <button onClick={() => setIsJobModalOpen(false)} className="btn-icon">
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 2 }}>
                  <label className="form-label">Nome do Cargo</label>
                  <input
                    type="text"
                    placeholder="Ex: Desenvolvedor Senior"
                    value={jobTitleName}
                    onChange={(e) => setJobTitleName(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Permissão</label>
                  <select
                    value={jobTitleAccess}
                    onChange={(e) => setJobTitleAccess(e.target.value)}
                    className="form-select"
                  >
                    <option value="employee">Comum</option>
                    <option value="manager">Gerente</option>
                  </select>
                </div>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={() => {
                    if (jobTitleName.trim()) {
                      addJobTitle({ name: jobTitleName.trim(), accessLevel: jobTitleAccess });
                      setJobTitleName('');
                      setJobTitleAccess('employee');
                    }
                  }}
                  style={{ height: '42px', padding: '0 16px' }}
                >
                  <Plus size={18} />
                </button>
              </div>

              <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
                {jobTitles.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '12px 0' }}>Nenhum cargo cadastrado.</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {jobTitles.map(jt => (
                      <li key={jt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{jt.name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Permissão: {jt.accessLevel === 'manager' ? 'Gerente' : 'Funcionário Comum'}
                          </span>
                        </div>
                        <button 
                          onClick={async () => {
                            if (await confirm(`Deseja excluir o cargo "${jt.name}"? Usuários com este cargo ficarão sem cargo atribuído.`, true)) {
                              deleteJobTitle(jt.id);
                            }
                          }}
                          className="btn-icon" 
                          style={{ color: 'var(--danger)', opacity: 0.8 }}
                          title="Excluir Cargo"
                        >
                          <Trash2 size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" onClick={() => setIsJobModalOpen(false)} className="btn btn-secondary">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Team;
