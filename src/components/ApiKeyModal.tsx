import React, { useState } from 'react';
import { geminiService } from '../services/geminiService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const ApiKeyModal: React.FC<Props> = ({ isOpen, onClose, onSaved }) => {
  const [keyInput, setKeyInput] = useState(geminiService.getApiKey());
  const [statusMsg, setStatusMsg] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    geminiService.setApiKey(keyInput);
    setStatusMsg('API ključ je sačuvan!');
    onSaved();
    setTimeout(() => {
      setStatusMsg('');
      onClose();
    }, 800);
  };

  const handleClear = () => {
    geminiService.setApiKey('');
    setKeyInput('');
    setStatusMsg('API ključ uklonjen (koristi se offline režim).');
    onSaved();
  };

  return (
    <div className="wizard-modal-backdrop" onClick={onClose}>
      <div className="wizard-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="wizard-modal-header">
          <h3>✨ Google Gemini AI Podešavanje</h3>
          <button type="button" className="wizard-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="wizard-modal-body">
          <p className="wizard-modal-desc">
            Unesite svoj <strong>Gemini API ključ</strong> za omogućavanje dinamičkih AI odgovora u realnom vremenu uz model <code>gemini-2.5-flash</code>.
            Ukoliko ključ nije unet, aplikacija automatski koristi bogati lokalni <strong>offline fond reakcija</strong>!
          </p>
          <div className="wizard-input-group">
            <input
              type="password"
              placeholder="AIzaSy..."
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="wizard-key-input"
            />
          </div>
          {statusMsg && <div className="wizard-status-msg">{statusMsg}</div>}
        </div>
        <div className="wizard-modal-footer">
          {keyInput && (
            <button type="button" className="hud-btn" onClick={handleClear}>
              Obriši
            </button>
          )}
          <button type="button" className="hud-btn active" onClick={handleSave}>
            Sačuvaj
          </button>
        </div>
      </div>
    </div>
  );
};

