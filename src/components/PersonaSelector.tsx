import React from 'react';
import { PERSONAS, PersonaId } from '../services/geminiService';

interface Props {
  selectedPersona: PersonaId;
  onSelectPersona: (id: PersonaId) => void;
}

export const PersonaSelector: React.FC<Props> = ({ selectedPersona, onSelectPersona }) => {
  return (
    <div className="persona-selector-bar">
      {(Object.keys(PERSONAS) as PersonaId[]).map((id) => {
        const p = PERSONAS[id];
        const isActive = selectedPersona === id;
        return (
          <button
            key={id}
            type="button"
            className={`persona-pill ${isActive ? 'active' : ''}`}
            onClick={() => onSelectPersona(id)}
            title={p.description}
          >
            <span className="persona-emoji">{p.avatar}</span>
            <span className="persona-name">{p.name}</span>
            <span className="persona-badge-sub">{p.badge}</span>
          </button>
        );
      })}
    </div>
  );
};

