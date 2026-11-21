import React from 'react';
import { evalToDisplay, type StockfishEval } from '../shared/chessRules';

interface Props {
  evalState: StockfishEval | null;
  flipped?: boolean;
  isEvaluating?: boolean;
  variant?: 'hud' | 'board2d';
}

export const EvalBar: React.FC<Props> = ({
  evalState,
  flipped = false,
  isEvaluating = false,
  variant = 'hud',
}) => {
  const display = evalToDisplay(evalState ?? { whiteCp: 0, mateIn: null });
  const scale = Math.max(0.02, Math.min(1, display.whitePercent / 100));
  const whiteAhead = (evalState?.whiteCp ?? 0) >= 0;

  return (
    <div
      className={`eval-bar-shell eval-bar-${variant} ${flipped ? 'is-flipped' : ''} ${
        isEvaluating ? 'is-evaluating' : ''
      }`}
      role="status"
      aria-label={`Procena pozicije: ${display.label} (${display.advantageText})`}
      title={`Stockfish procena: ${display.label} · ${display.advantageText}`}
    >
      <div className={`eval-score-badge ${whiteAhead ? 'white-lead' : 'black-lead'}`}>
        {display.label}
      </div>
      <div className="eval-track" aria-hidden="true">
        <div
          className="eval-white-fill"
          style={{
            transform: `scaleY(${scale})`,
            transformOrigin: flipped ? 'top center' : 'bottom center',
          }}
        />
        <div className="eval-mid-line" />
      </div>
    </div>
  );
};
