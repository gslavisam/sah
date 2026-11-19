import React, { useEffect, useState } from 'react';
import { PERSONAS } from '../services/geminiService';
import { multiplayerService, type OnlineSessionSnapshot } from '../services/multiplayerService';

interface Props {
  session: OnlineSessionSnapshot;
  onResign: () => void;
  onOfferDraw: () => void;
  onRespondDraw: (accept: boolean) => void;
  onRematch: () => void;
  onLeave: () => void;
  onShowInviteModal: () => void;
}

function formatClock(ms: number): string {
  const clamped = Math.max(0, ms);
  if (clamped < 10_000) {
    return `${(clamped / 1000).toFixed(1)}s`;
  }
  const totalSec = Math.ceil(clamped / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const OnlineMatchBar: React.FC<Props> = ({
  session,
  onResign,
  onOfferDraw,
  onRespondDraw,
  onRematch,
  onLeave,
  onShowInviteModal,
}) => {
  const [clocks, setClocks] = useState<{ whiteMs: number; blackMs: number }>(() =>
    multiplayerService.getLiveClocks()
  );
  const [confirmResign, setConfirmResign] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const room = session.roomState;
  const yourColor = session.yourColor;

  useEffect(() => {
    setClocks(multiplayerService.getLiveClocks());
    if (!room || room.status !== 'playing') {
      setConfirmResign(false);
      return;
    }
    const timer = setInterval(() => {
      setClocks(multiplayerService.getLiveClocks());
    }, 100);
    return () => clearInterval(timer);
  }, [room, session.clockAnchor]);

  useEffect(() => {
    if (!confirmResign) return;
    const timeout = setTimeout(() => setConfirmResign(false), 3500);
    return () => clearTimeout(timeout);
  }, [confirmResign]);

  if (!room || !yourColor) return null;

  const opponentColor = yourColor === 'w' ? 'b' : 'w';
  const yourSlot = room.players[yourColor];
  const opponentSlot = room.players[opponentColor];
  const opponentPersona = opponentSlot ? PERSONAS[opponentSlot.avatar] : null;

  const yourClockMs = yourColor === 'w' ? clocks.whiteMs : clocks.blackMs;
  const opponentClockMs = opponentColor === 'w' ? clocks.whiteMs : clocks.blackMs;

  const isPlaying = room.status === 'playing';
  const isEnded = room.status === 'ended';
  const isWaiting = room.status === 'waiting';

  const currentTurn = room.chess.currentTurn;
  const incomingDrawOffer = isPlaying && room.drawOfferFrom === opponentColor;
  const outgoingDrawOffer = isPlaying && room.drawOfferFrom === yourColor;

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(multiplayerService.buildInviteUrl(room.roomId));
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      onShowInviteModal();
    }
  };

  let outcomeText = '';
  if (isEnded) {
    if (room.outcome.reason === 'checkmate') {
      outcomeText = room.outcome.winner === yourColor ? 'Pobeda (Šah-mat)' : 'Poraz (Šah-mat)';
    } else if (room.outcome.reason === 'resign') {
      outcomeText = room.outcome.winner === yourColor ? 'Pobeda (Predaja)' : 'Poraz (Predaja)';
    } else if (room.outcome.reason === 'timeout') {
      outcomeText = room.outcome.winner === yourColor ? 'Pobeda (Vreme)' : 'Poraz (Vreme)';
    } else {
      outcomeText = 'Remi';
    }
  }

  let rematchLabel = '⚔ Revanš';
  if (yourSlot?.rematchRequested && !opponentSlot?.rematchRequested) {
    rematchLabel = 'Čekanje protivnika...';
  } else if (!yourSlot?.rematchRequested && opponentSlot?.rematchRequested) {
    rematchLabel = '✓ Prihvati revanš';
  }

  return (
    <div id="online-match-bar" className="online-match-bar">
      <div className="online-bar-row">
        <button
          type="button"
          className="online-room-chip"
          onClick={handleCopyInvite}
          title="Kopiraj link za poziv u sobu"
        >
          <span>Soba {room.roomId}</span>
          <span className="online-room-copy-tag">{copiedCode ? '✓' : '🔗'}</span>
        </button>

        {isWaiting ? (
          <div className="online-waiting-inline">
            <span className="online-pulse-dot"></span>
            <span>Čekanje protivnika...</span>
            <button type="button" className="online-bar-btn" onClick={onShowInviteModal}>
              Pozovi
            </button>
          </div>
        ) : (
          <div className="online-clocks-group">
            <div
              className={`online-clock ${
                isPlaying && currentTurn === yourColor ? 'active-turn' : ''
              } ${yourClockMs < 15_000 && isPlaying ? 'low-time' : ''}`}
            >
              <span className="online-clock-label">
                {yourSlot?.displayName || 'Ti'} ({yourColor === 'w' ? '♔' : '♚'})
                {yourSlot?.levelTitle && yourSlot.levelTitle !== 'Gost' ? (
                  <span className="online-rank-tag">{yourSlot.levelTitle}</span>
                ) : null}
              </span>
              <span className="online-clock-time">{formatClock(yourClockMs)}</span>
            </div>

            <div
              className={`online-clock ${
                isPlaying && currentTurn === opponentColor ? 'active-turn' : ''
              } ${opponentClockMs < 15_000 && isPlaying ? 'low-time' : ''}`}
            >
              <span className="online-clock-label">
                <span
                  className={`online-conn-dot ${
                    opponentSlot?.connected ? 'connected' : 'disconnected'
                  }`}
                ></span>
                {opponentPersona ? `${opponentPersona.avatar} ` : ''}
                {opponentSlot?.displayName || opponentPersona?.name || 'Protivnik'} (
                {opponentColor === 'w' ? '♔' : '♚'})
                {opponentSlot?.levelTitle && opponentSlot.levelTitle !== 'Gost' ? (
                  <span className="online-rank-tag">{opponentSlot.levelTitle}</span>
                ) : null}
              </span>
              <span className="online-clock-time">{formatClock(opponentClockMs)}</span>
            </div>
          </div>
        )}

        <div className="online-bar-actions">
          {isPlaying && (
            <>
              <button
                type="button"
                className="online-bar-btn"
                disabled={outgoingDrawOffer}
                onClick={onOfferDraw}
                title="Ponudi remi protivniku"
              >
                {outgoingDrawOffer ? 'Remi ponuđen' : '🤝 Ponudi remi'}
              </button>
              <button
                type="button"
                className={`online-bar-btn danger ${confirmResign ? 'confirming' : ''}`}
                onClick={() => {
                  if (confirmResign) {
                    setConfirmResign(false);
                    onResign();
                  } else {
                    setConfirmResign(true);
                  }
                }}
                title="Predaj partiju"
              >
                {confirmResign ? 'Potvrdi predaju?' : '🏳 Predaj'}
              </button>
            </>
          )}

          {isEnded && (
            <>
              <span className="online-outcome-badge">{outcomeText}</span>
              <button
                type="button"
                className="online-bar-btn primary"
                disabled={Boolean(yourSlot?.rematchRequested)}
                onClick={onRematch}
              >
                {rematchLabel}
              </button>
            </>
          )}

          <button type="button" className="online-bar-btn" onClick={onLeave}>
            {isEnded ? 'Izađi' : 'Napusti'}
          </button>
        </div>
      </div>

      {incomingDrawOffer ? (
        <div className="online-draw-banner">
          <span>🤝 Protivnik nudi remi. Da li prihvataš?</span>
          <div className="online-draw-banner-actions">
            <button
              type="button"
              className="online-bar-btn primary"
              onClick={() => onRespondDraw(true)}
            >
              Prihvati
            </button>
            <button
              type="button"
              className="online-bar-btn"
              onClick={() => onRespondDraw(false)}
            >
              Odbij
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
