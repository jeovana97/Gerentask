import React, { useState, useRef } from 'react';
import { useConfirm } from '../context/ConfirmContext';
import { Upload, X, Download, Loader, AlertCircle } from 'lucide-react';

const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/xml', 'application/xml',
];

const FILE_EXT_LABELS = {
  'application/pdf': 'PDF',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'text/xml': 'XML',
  'application/xml': 'XML',
};

const FILE_EXT_COLORS = {
  'application/pdf': '#e74c3c',
  'application/vnd.ms-excel': '#27ae60',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '#27ae60',
  'application/msword': '#2980b9',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '#2980b9',
  'text/xml': '#d35400',
  'application/xml': '#d35400',
};

const formatSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const TaskAttachments = ({ taskId, attachments = [], onAdd, onRemove, canEdit = true }) => {
  const confirm = useConfirm();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const fileInputRef = useRef(null);

  const handleFiles = async (files) => {
    setError(null);
    const file = files[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Tipo de arquivo não suportado. Permitido: Imagens, PDF, Excel e Word.');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError('Arquivo muito grande. Limite: ' + MAX_SIZE_MB + ' MB.');
      return;
    }
    setUploading(true);
    try {
      await onAdd(file);
    } catch (err) {
      let msg = err.message || 'Erro ao fazer upload.';
      if (msg === 'Failed to fetch') msg = 'Erro de conexão com o servidor. Tente novamente.';
      setError(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  // Confirmação antes de remover
  const handleRemove = async (att) => {
    if (await confirm('Deseja realmente remover o anexo "' + att.name + '"?', true)) {
      onRemove(att.id);
    }
  };

  const images = attachments.filter(a => a.type && a.type.startsWith('image/'));
  const docs = attachments.filter(a => a.type && !a.type.startsWith('image/'));

  return (
    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
      <h4 style={{ fontSize: '1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--text-primary)' }}>
        <Upload size={16} />
        Anexos ({attachments.length})
      </h4>

      {canEdit && (
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          style={{
            border: '2px dashed ' + (isDragging ? 'var(--accent-primary)' : 'var(--border-color)'),
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center',
            cursor: uploading ? 'not-allowed' : 'pointer',
            background: isDragging ? 'rgba(99,102,241,0.05)' : 'rgba(255,255,255,0.01)',
            transition: 'all 0.2s ease',
            marginBottom: '16px',
          }}
        >
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '8px', color: 'var(--danger)', marginBottom: '16px', fontSize: '0.85rem' }}>
              <AlertCircle size={16} />
              <span style={{ flex: 1 }}>{error}</span>
              <X size={16} style={{ cursor: 'pointer', opacity: 0.7 }} onClick={(e) => { e.stopPropagation(); setError(null); }} />
            </div>
          )}

          {uploading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
              <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
              <span>Fazendo upload...</span>
            </div>
          ) : (
            <>
              <Upload size={24} style={{ margin: '0 auto 8px', opacity: 0.5, display: 'block', color: 'var(--accent-primary)' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                Arraste ou <span style={{ color: 'var(--accent-primary)', fontWeight: '600' }}>clique para selecionar</span>
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>
                Imagem, PDF, Excel ou Word &mdash; máx. {MAX_SIZE_MB} MB
              </p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.xls,.xlsx,.doc,.docx,.xml"
            style={{ display: 'none' }}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      )}

      {images.length > 0 && (
        <div style={{ marginBottom: docs.length > 0 ? '16px' : 0 }}>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Imagens</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {images.map(att => (
              <div key={att.id} style={{ position: 'relative', display: 'inline-block' }}>
                <img
                  src={att.data}
                  alt={att.name}
                  onClick={() => setLightboxSrc(att.data)}
                  title={att.name + ' (' + formatSize(att.size) + ')'}
                  style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color)', cursor: 'zoom-in', transition: 'transform 0.15s ease' }}
                  onMouseOver={e => e.currentTarget.style.transform = 'scale(1.06)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                />
                {canEdit && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleRemove(att); }}
                    title="Remover"
                    style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {docs.length > 0 && (
        <div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Documentos</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {docs.map(att => {
              const extLabel = FILE_EXT_LABELS[att.type] || 'FILE';
              const extColor = FILE_EXT_COLORS[att.type] || '#888';
              return (
                <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: extColor + '22', border: '1px solid ' + extColor + '44', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: extColor, fontWeight: '800', fontSize: '0.6rem' }}>
                    {extLabel}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{att.name}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>{formatSize(att.size)} &middot; {att.uploadedBy}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <a
                      href={`http://${window.location.hostname}:3000` + att.url}
                      download={att.name}
                      onClick={(e) => e.stopPropagation()}
                      title="Baixar"
                      style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', background: 'rgba(99,102,241,0.12)', color: 'var(--accent-primary)', textDecoration: 'none' }}
                    >
                      <Download size={14} />
                    </a>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRemove(att); }}
                        title="Remover"
                        style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', background: 'rgba(231,76,60,0.1)', color: 'var(--danger)', border: 'none', cursor: 'pointer' }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {attachments.length === 0 && !canEdit && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '10px 0' }}>Nenhum anexo nesta tarefa.</p>
      )}

      {lightboxSrc && (
        <div
          onClick={() => setLightboxSrc(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out', backdropFilter: 'blur(4px)' }}
        >
          <button onClick={() => setLightboxSrc(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.12)', border: 'none', color: 'white', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={20} />
          </button>
          <img
            src={lightboxSrc}
            alt="Preview"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '10px', boxShadow: '0 30px 80px rgba(0,0,0,0.6)', objectFit: 'contain' }}
          />
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default TaskAttachments;
