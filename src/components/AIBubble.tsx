import React, { useEffect, useState } from 'react';
import { PERSONAS, PersonaId, geminiService } from '../services/geminiService';
import { voiceService } from '../services/voiceService';

interface Props {
  personaId: PersonaId;
  message: string;
  isLoading: boolean;
  onOpenApiKeyModal: () => void;
  onRequestHint: () => void;
}

export const AIBubble: React.FC<Props> = ({
  personaId,
  message,
  isLoading,
  onOpenApiKeyModal,
  onRequestHint,
}) => {
  const [minimized, setMinimized] = useState(false);
  const [voiceActive, setVoiceActive] = useState(voiceService.isEnabled());
  const persona = PERSONAS[personaId] || PERSONAS.mentor;
  const hasKey = Boolean(geminiService.getApiKey());

  const handleToggleVoice = () => {
    const newState = voiceService.toggleVoice();
    setVoiceActive(newState);
    if (newState) {
      voiceService.speak(message, personaId);
    }
  };

  useEffect(() => {
    if (message && !isLoading && voiceActive) {
      voiceService.speak(message, personaId);
    }
  }, [message, isLoading, personaId, voiceActive]);

  if (minimized) {
    return (
      <div className="ai-bubble-minimized" onClick={() => setMinimized(false)} title="Otvori AI Komentara">
        <span className="bubble-avatar">{persona.avatar}</span>
        <span className="bubble-min-text">{persona.name}: "{message.slice(0, 26)}..."</span>
        <span className="bubble-min-open">▲</span>
      </div>
    );
  }

  return (
    <div className="ai-bubble-container" role="region" aria-label="AI Komentator">
      <div className="ai-bubble-header">
        <div className="ai-bubble-identity">
          <span className="ai-avatar">{persona.avatar}</span>
          <div className="ai-meta">
            <span className="ai-name">{persona.name}</span>
            <span className="ai-title">{persona.title}</span>
          </div>
        </div>
        <div className="ai-bubble-actions">
          <button
            type="button"
            className={`ai-action-btn voice-btn ${voiceActive ? 'active' : ''}`}
            onClick={handleToggleVoice}
            title={voiceActive ? 'Glasovni komentar: Uključen' : 'Glasovni komentar: Isključen'}
          >
            {voiceActive ? '🔊 Glas' : '🔇 Nem'}
          </button>
          <button
            type="button"
            className="ai-action-btn hint-btn"
            onClick={onRequestHint}
            disabled={isLoading}
            title="Zatraži jednostavan savet za početnike"
          >
            💡 Savet
          </button>
          <button
            type="button"
            className={`ai-action-btn key-btn ${hasKey ? 'active' : ''}`}
            onClick={onOpenApiKeyModal}
            title={hasKey ? 'Gemini AI povezan' : 'Poveži Gemini API Ključ'}
          >
            {hasKey ? '⚡ Gemini' : '🔑 Ključ'}
          </button>
          <button
            type="button"
            className="ai-action-btn min-btn"
            onClick={() => setMinimized(true)}
            title="Smanji prozor"
          >
            ▼
          </button>
        </div>
      </div>

      <div className="ai-bubble-body">
        {isLoading ? (
          <div className="ai-typing-indicator">
            <span></span>
            <span></span>
            <span></span>
            <span className="ai-typing-text">{persona.name} razmišlja...</span>
          </div>
        ) : (
          <p className="ai-speech-text">{message}</p>
        )}
      </div>
    </div>
  );
};
