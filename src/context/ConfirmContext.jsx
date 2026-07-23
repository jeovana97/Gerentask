import React, { createContext, useContext, useState, useCallback } from 'react';

const ConfirmContext = createContext();

export const useConfirm = () => useContext(ConfirmContext);

export const ConfirmProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [onConfirm, setOnConfirm] = useState(() => () => {});
  const [onCancel, setOnCancel] = useState(() => () => {});
  const [isDanger, setIsDanger] = useState(false);
  const [isPrompt, setIsPrompt] = useState(false);
  const [isAlert, setIsAlert] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const [confirmText, setConfirmText] = useState('Confirmar');
  const [cancelText, setCancelText] = useState('Cancelar');

  const confirm = useCallback((msg, dangerOrOptions = false) => {
    return new Promise((resolve) => {
      let danger = false;
      let cText = 'Confirmar';
      let canText = 'Cancelar';

      if (typeof dangerOrOptions === 'object' && dangerOrOptions !== null) {
        danger = !!dangerOrOptions.danger;
        if (dangerOrOptions.confirmText) cText = dangerOrOptions.confirmText;
        if (dangerOrOptions.cancelText) canText = dangerOrOptions.cancelText;
      } else {
        danger = !!dangerOrOptions;
      }

      setMessage(msg);
      setIsDanger(danger);
      setConfirmText(cText);
      setCancelText(canText);
      setIsPrompt(false);
      setIsAlert(false);
      setIsOpen(true);
      
      setOnConfirm(() => () => {
        setIsOpen(false);
        resolve(true);
      });
      
      setOnCancel(() => () => {
        setIsOpen(false);
        resolve(false);
      });
    });
  }, []);

  const prompt = useCallback((msg, danger = false) => {
    return new Promise((resolve) => {
      setMessage(msg);
      setIsDanger(danger);
      setConfirmText('Confirmar');
      setCancelText('Cancelar');
      setIsPrompt(true);
      setIsAlert(false);
      setInputValue('');
      setIsOpen(true);
      
      setOnConfirm(() => (value) => {
        setIsOpen(false);
        resolve(value);
      });
      
      setOnCancel(() => () => {
        setIsOpen(false);
        resolve(null);
      });
    });
  }, []);

  const alertMsg = useCallback((msg, danger = false) => {
    return new Promise((resolve) => {
      setMessage(msg);
      setIsDanger(danger);
      setConfirmText('OK');
      setCancelText('Cancelar');
      setIsPrompt(false);
      setIsAlert(true);
      setIsOpen(true);
      
      const close = () => {
        setIsOpen(false);
        resolve(true);
      };
      setOnConfirm(() => close);
      setOnCancel(() => close);
    });
  }, []);

  const confirmValue = useCallback((msg, danger = false) => confirm(msg, danger), [confirm]);
  confirmValue.prompt = prompt;
  confirmValue.alert = alertMsg;

  return (
    <ConfirmContext.Provider value={confirmValue}>
      {children}
      {isOpen && (
        <div className="modal-overlay" onMouseDown={() => onCancel()} style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '420px', textAlign: 'center', padding: '32px' }} onMouseDown={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px' }}>
              {isAlert ? (isDanger ? 'Atenção' : 'Aviso') : isPrompt ? 'Atenção' : 'Confirmação'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: isPrompt ? '16px' : '32px', whiteSpace: 'pre-wrap', lineHeight: '1.5', fontSize: '0.95rem' }}>
              {message}
            </p>
            {isPrompt && (
              <textarea
                autoFocus
                className="form-input"
                style={{ width: '100%', marginBottom: '24px', minHeight: '80px', resize: 'vertical' }}
                placeholder="Digite o motivo..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              {!isAlert && (
                <button className="btn btn-secondary" onClick={() => onCancel()} style={{ padding: '10px 24px' }}>
                  {cancelText}
                </button>
              )}
              <button 
                className="btn btn-primary" 
                onClick={() => onConfirm(isPrompt ? inputValue : true)}
                style={{ padding: '10px 24px', background: isDanger ? 'var(--danger)' : 'var(--accent-primary)' }}
              >
                {isAlert ? 'OK' : confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

