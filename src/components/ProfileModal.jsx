import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { X, Camera, Lock, Save, Trash2 } from 'lucide-react';
import { api } from '../services/db';

const ProfileModal = ({ onClose }) => {
  const { user, updateCurrentUser } = useAuth();
  const { reloadData } = useData();

  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [photoPreview, setPhotoPreview] = useState(user?.photo || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('O arquivo deve ser uma imagem.');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setError('A imagem deve ter no máximo 2MB.');
        return;
      }

      setError('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearPhoto = () => {
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const updates = {};
      if (password) {
        if (currentPassword !== user.password) {
          setError('A senha atual está incorreta.');
          setIsSubmitting(false);
          return;
        }
        if (password.length < 6) {
          setError('A nova senha deve ter no mínimo 6 caracteres.');
          setIsSubmitting(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('As novas senhas não coincidem.');
          setIsSubmitting(false);
          return;
        }
        updates.password = password;
      }
      
      updates.photo = photoPreview;

      const response = await api.put(`/users/${user.id}`, updates);
      
      if (!response.error) {
        updateCurrentUser({ ...user, ...updates });
        await reloadData();
        onClose();
      } else {
        setError(response.error || 'Erro ao atualizar o perfil.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao se conectar com o servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-content animate-slide-up" style={{ maxWidth: '450px' }}>
        <div className="modal-header">
          <h3 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Meu Perfil
          </h3>
          <button onClick={onClose} className="btn btn-icon" title="Fechar" disabled={isSubmitting}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && (
            <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '6px', marginBottom: '16px', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{ position: 'relative' }}>
              {photoPreview ? (
                <img 
                  src={photoPreview} 
                  alt="Pré-visualização" 
                  style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--border-color)' }} 
                />
              ) : (
                <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--bg-card-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', border: '3px dashed var(--border-color)' }}>
                  <Camera size={32} />
                </div>
              )}
              {photoPreview && (
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="btn btn-icon"
                  style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'var(--danger)', color: 'white', padding: '4px', borderRadius: '50%' }}
                  title="Remover foto"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <label htmlFor="profile-photo" className="btn btn-secondary" style={{ display: 'inline-flex', cursor: 'pointer', alignItems: 'center', gap: '8px' }}>
                <Camera size={16} />
                Escolher Nova Foto
              </label>
              <input 
                id="profile-photo"
                type="file" 
                ref={fileInputRef}
                accept="image/*" 
                onChange={handlePhotoChange} 
                style={{ display: 'none' }}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                JPG ou PNG. Max 2MB.
              </p>
            </div>
          </div>

          <div className="form-group" style={{ padding: '16px', background: 'var(--bg-card-hover)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={16} /> Alterar Senha (Opcional)
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', marginBottom: '4px', display: 'block', color: 'var(--text-secondary)' }}>Senha Atual</label>
                <input
                  type="password"
                  className="form-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Necessária apenas se for alterar a senha"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', marginBottom: '4px', display: 'block', color: 'var(--text-secondary)' }}>Nova Senha</label>
                <input
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Deixe em branco para não alterar"
                  minLength={6}
                />
              </div>

              {password && (
                <div className="animate-slide-up">
                  <label style={{ fontSize: '0.8rem', marginBottom: '4px', display: 'block', color: 'var(--text-secondary)' }}>Repetir Nova Senha</label>
                  <input
                    type="password"
                    className="form-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    minLength={6}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer" style={{ marginTop: '32px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} disabled={isSubmitting}>
              <Save size={18} />
              {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ProfileModal;
