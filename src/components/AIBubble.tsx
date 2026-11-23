import React, { useEffect, useState } from 'react';
import { PERSONAS, PersonaId } from '../services/geminiService';
import { voiceService, type VoiceCue } from '../services/voiceService';

interface Props {
  personaId: PersonaId;
  message: string;
  voiceCue?: VoiceCue;
  isLoading: boolean;
  hintDisabled?: boolean;
  zenMode?: boolean;
  guidedMode?: boolean;
  onRequestHint: () => void;
}

export const AIBubble: React.FC<Props> = ({
  personaId,
  message,
  voiceCue,
  isLoading,
  hintDisabled = false,
  zenMode = false,
  guidedMode = false,
  onRequestHint,
}) => {
  const [minimized, setMinimized] = useState(false);
  const [voiceActive, setVoiceActive] = useState(voiceService.isEnabled());
  const persona = PERSONAS[personaId] || PERSONAS.mentor;

  const handleToggleVoice = () => {
    if (zenMode) return;
    const newState = voiceService.toggleVoice();
    setVoiceActive(newState);
    if (newState) {
      voiceService.speak(message, personaId, voiceCue);
    }
  };

  useEffect(() => {
    if (zenMode) {
      voiceService.stop();
      return;
    }
    if (message && !isLoading && voiceActive) {
      voiceService.speak(message, personaId, voiceCue);
    }
  }, [message, voiceCue, isLoading, personaId, voiceActive, zenMode]);

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
            <span className="ai-title">
              {guidedMode
                ? 'Vođeni režim · automatski saveti'
                : zenMode
                  ? 'Central Park · Zen tekstualni saveti'
                  : persona.title}
            </span>
          </div>
        </div>
        <div className="ai-bubble-actions">
          <button
            type="button"
            className={`ai-action-btn voice-btn ${voiceActive && !zenMode ? 'active' : ''}`}
            onClick={handleToggleVoice}
            disabled={zenMode}
            title={
              zenMode
                ? 'Glasovni komentari su isključeni u Park (Zen) režimu'
                : voiceActive
                  ? 'Glasovni komentar: Uključen'
                  : 'Glasovni komentar: Isključen'
            }
          >
            {zenMode ? '🌿 Zen' : voiceActive ? '🔊 Glas' : '🔇 Nem'}
          </button>
          <button
            type="button"
            className="ai-action-btn hint-btn"
            onClick={onRequestHint}
            disabled={isLoading || hintDisabled}
            title={hintDisabled ? 'Savet nije dostupan tokom online duela' : 'Zatraži Stockfish savet za sledeći potez'}
          >
            💡 Savet
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
