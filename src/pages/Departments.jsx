import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useConfirm } from '../context/ConfirmContext';
import { Plus, Edit, Trash2, X, FolderOpen, Briefcase, FileText, AlertTriangle } from 'lucide-react';

const Departments = () => {
  const { user } = useAuth();
  const { 
    departments, 
    allDepartments,
    tasks, 
    users, 
    addDepartment, 
    updateDepartment, 
    deleteDepartment 
  } = useData();
  const confirm = useConfirm();

  // Estados dos modais e forms
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);

  // Segurança de perfil
  if (!['manager', 'master'].includes(user.role)) {
    return (
      <div className="page-container" style={{ textAlign: 'center', marginTop: '80px' }}>
        <AlertTriangle size={48} style={{ color: 'var(--danger)', marginBottom: '16px' }} />
        <h3>Acesso Restrito</h3>
        <p style={{ color: 'var(--text-secondary)' }}>Esta página só pode ser visualizada por Gerentes do sistema.</p>
      </div>
    );
  }

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setDeptName('');
    setDeptDesc('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (dept) => {
    setIsEditing(true);
    setEditingId(dept.id);
    setDeptName(dept.name);
    setDeptDesc(dept.description);
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!deptName.trim() || !deptDesc.trim()) {
      confirm.alert('Por favor, preencha todos os campos.');
      return;
    }

    const deptData = {
      name: deptName,
      description: deptDesc
    };

    if (isEditing) {
      updateDepartment(editingId, deptData);
    } else {
      addDepartment(deptData);
    }

    setIsModalOpen(false);
  };

  const handleDelete = async (deptId, name) => {
    console.log('handleDelete chamado com:', deptId, name);
    const associatedUsers = users.filter(u => u.departmentId === deptId).length;
    const associatedTasks = tasks.filter(t => t.departmentId === deptId).length;
    console.log('handleDelete: membros associados:', associatedUsers, 'tarefas associadas:', associatedTasks);

    let confirmMsg = `Deseja realmente excluir o departamento "${name}"?`;
    if (associatedUsers > 0 || associatedTasks > 0) {
      confirmMsg += `\n\nATENÇÃO: Existem ${associatedUsers} membros e ${associatedTasks} tarefas neste departamento. Eles serão desatribuídos ou movidos para sem setor.`;
    }

    if (await confirm(confirmMsg, true)) {
      console.log('handleDelete: exclusão confirmada pelo usuário. Chamando deleteDepartment...');
      deleteDepartment(deptId);
    } else {
      console.log('handleDelete: exclusão cancelada pelo usuário.');
    }
  };

  return (
    <div className="page-container animate-fade-in">
      {/* Header interno */}
      <div className="flex-between" style={{ marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>
            Gerenciamento de Setores
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Organize os departamentos e setores da empresa para distribuição de demandas.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowDeleted(!showDeleted)}
            className={`btn ${showDeleted ? 'btn-primary' : 'btn-secondary'}`}
          >
            {showDeleted ? 'Ocultar Excluídos' : 'Mostrar Excluídos'}
          </button>
          <button onClick={handleOpenCreateModal} className="btn btn-primary">
            <Plus size={18} />
            <span>Cadastrar Setor</span>
          </button>
        </div>
      </div>

      {/* Grid de Departamentos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px' }}>
        {(showDeleted ? allDepartments : departments).map(dept => {
          // Estatísticas do setor
          const deptUsersCount = users.filter(u => u.departmentId === dept.id).length;
          const deptTasks = tasks.filter(t => t.departmentId === dept.id);
          const doneTasksCount = deptTasks.filter(t => t.status === 'done').length;
          const totalTasksCount = deptTasks.length;

          return (
            <div key={dept.id} className="glass-card animate-slide-up" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '240px' }}>
              <div className="flex-between" style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    background: 'rgba(6, 182, 212, 0.15)',
                    color: 'var(--accent-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FolderOpen size={20} />
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                    {dept.name}
                  </h3>
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                  {!dept.deletedAt && (
                    <>
                      <button onClick={() => handleOpenEditModal(dept)} className="btn-icon" title="Editar">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => handleDelete(dept.id, dept.name)} className="btn-icon" style={{ color: 'var(--danger)' }} title="Excluir">
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                  {dept.deletedAt && (
                    <span className="badge badge-high" style={{ fontSize: '0.65rem' }}>
                      Excluído em {new Date(dept.deletedAt).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: '1.5', flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {dept.description}
              </p>

              {/* Informações Estatísticas do Setor */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                borderTop: '1px solid var(--border-color)',
                paddingTop: '16px',
                marginTop: '16px',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Briefcase size={14} style={{ color: 'var(--accent-primary)' }} />
                  <span><strong>{deptUsersCount}</strong> membros</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={14} style={{ color: 'var(--success)' }} />
                  <span><strong>{doneTasksCount}/{totalTasksCount}</strong> concluídas</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* --- MODAL DE CRIAÇÃO / EDIÇÃO DE DEPARTAMENTO --- */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                {isEditing ? 'Editar Setor' : 'Adicionar Novo Setor'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="btn-icon">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Nome do Departamento *</label>
                  <input
                    type="text"
                    placeholder="Ex: Recursos Humanos"
                    value={deptName}
                    onChange={(e) => setDeptName(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Breve Descrição *</label>
                  <textarea
                    rows="3"
                    placeholder="Descreva o papel ou as principais atividades deste setor na empresa..."
                    value={deptDesc}
                    onChange={(e) => setDeptDesc(e.target.value)}
                    className="form-textarea"
                    required
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {isEditing ? 'Salvar Alterações' : 'Salvar Setor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Departments;
