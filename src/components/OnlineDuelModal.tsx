import React, { useEffect, useState } from 'react';
import { PERSONAS } from '../services/geminiService';
import { multiplayerService, type OnlineSessionSnapshot } from '../services/multiplayerService';
import {
  TIME_CONTROLS,
  type OnlinePersonaId,
  type PreferredSide,
  type TimeControlId,
} from '../shared/multiplayerTypes';

interface Props {
  isOpen: boolean;
  initialTab?: 'create' | 'join';
  initialJoinCode?: string;
  session: OnlineSessionSnapshot;
  onClose: () => void;
  onCreateRoom: (
    timeControlId: TimeControlId,
    preferredSide: PreferredSide,
    avatar: OnlinePersonaId
  ) => void;
  onJoinRoom: (roomId: string, avatar: OnlinePersonaId) => void;
  onCancelWaiting: () => void;
  onClearError: () => void;
}

const TIME_CONTROL_ORDER: TimeControlId[] = ['3+2', '5+0', '10+0', '15+10'];
const AVATAR_ORDER: OnlinePersonaId[] = ['mentor', 'roast', 'rival'];

export const OnlineDuelModal: React.FC<Props> = ({
  isOpen,
  initialTab = 'create',
  initialJoinCode = '',
  session,
  onClose,
  onCreateRoom,
  onJoinRoom,
  onCancelWaiting,
  onClearError,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>(initialTab);
  const [timeControlId, setTimeControlId] = useState<TimeControlId>('5+0');
  const [preferredSide, setPreferredSide] = useState<PreferredSide>('random');
  const [avatar, setAvatar] = useState<OnlinePersonaId>('mentor');
  const [joinCode, setJoinCode] = useState(initialJoinCode);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      if (initialJoinCode) {
        setJoinCode(initialJoinCode.toUpperCase());
      }
      setCopiedLink(false);
    }
  }, [isOpen, initialTab, initialJoinCode]);

  if (!isOpen) return null;

  const isInRoom = Boolean(session.roomId && session.roomState);
  const isWaitingInRoom = Boolean(
    session.roomId && session.roomState && session.roomState.status === 'waiting'
  );
  const isConnecting = session.connectionState === 'connecting';

  const inviteUrl = session.roomId ? multiplayerService.buildInviteUrl(session.roomId) : '';

  const handleCopyInvite = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback selection handled via input
    }
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = joinCode.trim().toUpperCase();
    if (!cleaned) return;
    onJoinRoom(cleaned, avatar);
  };

  return (
    <div
      className="wizard-modal-backdrop"
      id="online-duel-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Online Duel između dva igrača"
      onClick={onClose}
    >
      <div className="wizard-modal-box online-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="wizard-modal-header">
          <div>
            <div className="online-modal-eyebrow">SANCTUM PVP ARENA</div>
            <h3>⚔ Online Duel (1 na 1)</h3>
          </div>
          <button
            type="button"
            className="wizard-modal-close"
            onClick={onClose}
            aria-label="Zatvori prozor"
          >
            ✕
          </button>
        </div>

        {isInRoom && session.roomId && session.roomState ? (
          <div className="online-waiting-panel">
            <div className="online-waiting-badge">
              <span className="online-pulse-dot"></span>
              {isWaitingInRoom
                ? 'Soba je otvorena • Čekanje protivnika'
                : session.roomState.status === 'playing'
                  ? 'Duel je u toku'
                  : 'Duel je završen'}
            </div>

            <div className="online-room-code-card">
              <span className="online-room-code-label">KOD SOBE</span>
              <div className="online-room-code-value" id="online-waiting-code">
                {session.roomId}
              </div>
              <div className="online-room-meta">
                Tempo: <strong>{session.roomState.timeControl.label}</strong> &nbsp;•&nbsp; Tvoja boja:{' '}
                <strong>{session.yourColor === 'w' ? 'Beli ♔' : 'Crni ♚'}</strong>
              </div>
            </div>

            <div className="online-invite-row">
              <input
                type="text"
                readOnly
                value={inviteUrl}
                className="wizard-key-input online-invite-input"
                aria-label="Link za poziv prijatelja"
                onFocus={(e) => e.currentTarget.select()}
              />
              <button
                type="button"
                className="hud-btn primary online-copy-btn"
                onClick={handleCopyInvite}
              >
                {copiedLink ? '✓ Kopirano!' : 'Kopiraj link'}
              </button>
            </div>

            <p className="online-waiting-hint">
              {isWaitingInRoom
                ? 'Pošalji prijatelju kod ili link iznad. Partija i šahovski sat počinju čim se protivnik poveže.'
                : 'Možeš podeliti ovaj link za gledanje/povratak u sesiju ili se vratiti na tablu.'}
            </p>

            {session.error ? <div className="online-error-banner">{session.error}</div> : null}

            <div className="wizard-modal-footer">
              {!isWaitingInRoom && (
                <button type="button" className="hud-btn primary" onClick={onClose}>
                  Nazad na tablu
                </button>
              )}
              <button type="button" className="hud-btn" onClick={onCancelWaiting}>
                {isWaitingInRoom ? 'Otkaži sobu' : 'Napusti sobu'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="online-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'create'}
                className={`online-tab-btn ${activeTab === 'create' ? 'active' : ''}`}
                onClick={() => {
                  onClearError();
                  setActiveTab('create');
                }}
              >
                Napravi sobu
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'join'}
                className={`online-tab-btn ${activeTab === 'join' ? 'active' : ''}`}
                onClick={() => {
                  onClearError();
                  setActiveTab('join');
                }}
              >
                Pridruži se
              </button>
            </div>

            {activeTab === 'create' ? (
              <div className="online-form-stack">
                <div className="online-field-group">
                  <label className="online-field-label">Tempo igre (Šahovski sat)</label>
                  <div className="online-option-grid online-grid-4">
                    {TIME_CONTROL_ORDER.map((id) => (
                      <button
                        key={id}
                        type="button"
                        className={`online-choice-btn ${timeControlId === id ? 'active' : ''}`}
                        onClick={() => setTimeControlId(id)}
                      >
                        <span className="online-choice-main">{id}</span>
                        <span className="online-choice-sub">{TIME_CONTROLS[id].label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="online-field-group">
                  <label className="online-field-label">Tvoja strana table</label>
                  <div className="online-option-grid online-grid-3">
                    <button
                      type="button"
                      className={`online-choice-btn ${preferredSide === 'random' ? 'active' : ''}`}
                      onClick={() => setPreferredSide('random')}
                    >
                      <span className="online-choice-main">🎲 Nasumično</span>
                    </button>
                    <button
                      type="button"
                      className={`online-choice-btn ${preferredSide === 'w' ? 'active' : ''}`}
                      onClick={() => setPreferredSide('w')}
                    >
                      <span className="online-choice-main">♔ Beli</span>
                    </button>
                    <button
                      type="button"
                      className={`online-choice-btn ${preferredSide === 'b' ? 'active' : ''}`}
                      onClick={() => setPreferredSide('b')}
                    >
                      <span className="online-choice-main">♚ Crni</span>
                    </button>
                  </div>
                </div>

                <div className="online-field-group">
                  <label className="online-field-label">
                    Tvoj 3D Hologram avatar{' '}
                    <span className="online-field-note">(vidi ga protivnik preko puta table)</span>
                  </label>
                  <div className="online-option-grid online-grid-3">
                    {AVATAR_ORDER.map((id) => {
                      const persona = PERSONAS[id];
                      return (
                        <button
                          key={id}
                          type="button"
                          className={`online-choice-btn ${avatar === id ? 'active' : ''}`}
                          onClick={() => setAvatar(id)}
                        >
                          <span className="online-choice-main">
                            {persona.avatar} {persona.name}
                          </span>
                          <span className="online-choice-sub">{persona.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {session.error ? <div className="online-error-banner">{session.error}</div> : null}

                <div className="wizard-modal-footer">
                  <button type="button" className="hud-btn" onClick={onClose}>
                    Nazad
                  </button>
                  <button
                    type="button"
                    className="hud-btn primary"
                    id="btn-create-online-room"
                    disabled={isConnecting}
                    onClick={() => onCreateRoom(timeControlId, preferredSide, avatar)}
                  >
                    {isConnecting ? 'Povezivanje...' : 'Napravi privatnu sobu'}
                  </button>
                </div>
              </div>
            ) : (
              <form className="online-form-stack" onSubmit={handleJoinSubmit}>
                <div className="online-field-group">
                  <label className="online-field-label" htmlFor="input-online-room-code">
                    Kod sobe (6 karaktera)
                  </label>
                  <input
                    id="input-online-room-code"
                    type="text"
                    className="wizard-key-input online-code-input"
                    placeholder="NPR. K7M2XP"
                    maxLength={8}
                    value={joinCode}
                    onChange={(e) => {
                      onClearError();
                      setJoinCode(e.target.value.toUpperCase());
                    }}
                    autoFocus
                  />
                </div>

                <div className="online-field-group">
                  <label className="online-field-label">
                    Tvoj 3D Hologram avatar{' '}
                    <span className="online-field-note">(vidi ga protivnik preko puta table)</span>
                  </label>
                  <div className="online-option-grid online-grid-3">
                    {AVATAR_ORDER.map((id) => {
                      const persona = PERSONAS[id];
                      return (
                        <button
                          key={id}
                          type="button"
                          className={`online-choice-btn ${avatar === id ? 'active' : ''}`}
                          onClick={() => setAvatar(id)}
                        >
                          <span className="online-choice-main">
                            {persona.avatar} {persona.name}
                          </span>
                          <span className="online-choice-sub">{persona.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {session.error ? <div className="online-error-banner">{session.error}</div> : null}

                <div className="wizard-modal-footer">
                  <button type="button" className="hud-btn" onClick={onClose}>
                    Nazad
                  </button>
                  <button
                    type="submit"
                    className="hud-btn primary"
                    id="btn-join-online-room"
                    disabled={isConnecting || joinCode.trim().length < 4}
                  >
                    {isConnecting ? 'Povezivanje...' : 'Uđi u partiju'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};
