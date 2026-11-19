import React, { useEffect, useState } from 'react';
import { authService, type AuthSnapshot } from '../services/authService';
import { progressionService, type PlayerStats } from '../services/progressionService';
import { academyProgression } from '../services/academyProgression';
import type { MatchRecord } from '../shared/authTypes';

interface Props {
  isOpen: boolean;
  auth: AuthSnapshot;
  onClose: () => void;
}

const REASON_LABELS: Record<string, string> = {
  checkmate: 'Šah-mat',
  resign: 'Predaja',
  timeout: 'Isteklo vreme',
  stalemate: 'Pat',
  repetition: 'Trostruko ponavljanje',
  'fifty-move': 'Pravilo 50 poteza',
  draw_agreed: 'Dogovoreni remi',
  completed: 'Završeno',
};

function formatDate(ts: number): string {
  try {
    return new Date(ts).toLocaleString('sr-Latn-RS', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export const AccountModal: React.FC<Props> = ({ isOpen, auth, onClose }) => {
  const [guestTab, setGuestTab] = useState<'login' | 'register' | 'guest'>('login');
  const [profileTab, setProfileTab] = useState<'profile' | 'history'>('profile');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');

  const [editName, setEditName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [stats, setStats] = useState<PlayerStats>(() => progressionService.getStats());
  const [academyCount, setAcademyCount] = useState<number>(() =>
    academyProgression.getTotalCompleted()
  );

  useEffect(() => {
    const unsubStats = progressionService.subscribe(setStats);
    const unsubAcademy = academyProgression.subscribe(() => {
      setAcademyCount(academyProgression.getTotalCompleted());
    });
    return () => {
      unsubStats();
      unsubAcademy();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setStatusMsg(null);
    if (auth.user) {
      setEditName(auth.user.displayName);
      setProfileTab('profile');
    } else {
      setEditName(auth.guestName);
      setAcademyCount(academyProgression.getTotalCompleted());
    }
  }, [isOpen, auth.user, auth.guestName]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);
    if (!username.trim() || !password) {
      setErrorMsg('Unesi korisničko ime i lozinku.');
      return;
    }
    setBusy(true);
    const res = await authService.login(username, password);
    setBusy(false);
    if (!res.ok) {
      setErrorMsg(res.error);
    } else {
      setPassword('');
      setConfirmPassword('');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);
    if (!username.trim() || password.length < 6) {
      setErrorMsg('Korisničko ime (min 3) i lozinka (min 6 karaktera) su obavezni.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Lozinke se ne poklapaju.');
      return;
    }
    setBusy(true);
    const res = await authService.register(username, password, displayNameInput || undefined);
    setBusy(false);
    if (!res.ok) {
      setErrorMsg(res.error);
    } else {
      setPassword('');
      setConfirmPassword('');
      setDisplayNameInput('');
    }
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);
    if (editName.trim().length < 2) {
      setErrorMsg('Ime mora imati najmanje 2 karaktera.');
      return;
    }
    setBusy(true);
    const res = await authService.updateDisplayName(editName);
    setBusy(false);
    if (!res.ok) {
      setErrorMsg(res.error);
    } else {
      setStatusMsg('Ime za prikaz je sačuvano.');
    }
  };

  const handleLogout = async () => {
    setBusy(true);
    await authService.logout();
    setBusy(false);
    setGuestTab('login');
  };

  const renderMatchHistory = (matches: MatchRecord[]) => {
    if (matches.length === 0) {
      return (
        <div className="account-empty-history">
          Još uvek nema odigranih partija. Završene partije protiv AI-ja ili u online duelu pojaviće
          se ovde.
        </div>
      );
    }
    return (
      <div className="match-history-list">
        {matches.map((m) => (
          <div key={m.id} className={`match-history-item result-${m.result}`}>
            <div className="match-history-top">
              <span className={`match-result-badge ${m.result}`}>
                {m.result === 'win' ? 'Pobeda' : m.result === 'loss' ? 'Poraz' : 'Remi'}
              </span>
              <span className="match-mode-tag">
                {m.mode === 'online' ? '⚔ Online' : '⚡ AI'}
              </span>
              <span className="match-opponent-name">protiv {m.opponentName}</span>
            </div>
            <div className="match-history-meta">
              <span>{m.playerColor === 'w' ? '♔ Beli' : '♚ Crni'}</span>
              <span>•</span>
              <span>{REASON_LABELS[m.reason] || m.reason}</span>
              <span>•</span>
              <span>{m.moveCount} pot.</span>
              <span className="match-date">{formatDate(m.createdAt)}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderStatsSummary = () => (
    <div className="account-stats-grid">
      <div className="account-stat-box">
        <span className="account-stat-val">
          {stats.wins} / {stats.draws} / {stats.losses}
        </span>
        <span className="account-stat-lbl">P / R / I</span>
      </div>
      <div className="account-stat-box">
        <span className="account-stat-val">{stats.xp} XP</span>
        <span className="account-stat-lbl">
          Nivo {stats.level} • {stats.title}
        </span>
      </div>
      <div className="account-stat-box">
        <span className="account-stat-val">{stats.totalCaptures}</span>
        <span className="account-stat-lbl">Osvojenih figura</span>
      </div>
      <div className="account-stat-box">
        <span className="account-stat-val">{academyCount} / 48</span>
        <span className="account-stat-lbl">Akademija</span>
      </div>
    </div>
  );

  return (
    <div
      id="account-modal"
      className="wizard-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Profil igrača i prijava"
      onClick={onClose}
    >
      <div className="wizard-modal-box account-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="wizard-modal-header">
          <div>
            <div className="online-modal-eyebrow">SANCTUM IDENTITET</div>
            <h3>
              {auth.user
                ? `${auth.user.displayName}`
                : `Gost nalog (${auth.guestName})`}
            </h3>
          </div>
          <button
            type="button"
            className="wizard-modal-close"
            onClick={onClose}
            aria-label="Zatvori"
          >
            ✕
          </button>
        </div>

        {auth.user ? (
          <>
            <div className="online-tabs">
              <button
                type="button"
                className={`online-tab-btn ${profileTab === 'profile' ? 'active' : ''}`}
                onClick={() => setProfileTab('profile')}
              >
                Moj Profil
              </button>
              <button
                type="button"
                className={`online-tab-btn ${profileTab === 'history' ? 'active' : ''}`}
                onClick={() => setProfileTab('history')}
              >
                Istorija ({auth.matches.length})
              </button>
            </div>

            {profileTab === 'profile' ? (
              <div className="online-form-stack">
                <div className="account-user-banner">
                  <div>
                    <div className="account-username-handle">@{auth.user.username}</div>
                    <div className="account-rank-line">
                      Nivo {auth.user.stats.level} — {auth.user.stats.title}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="online-bar-btn danger"
                    disabled={busy}
                    onClick={handleLogout}
                  >
                    Odjavi se
                  </button>
                </div>

                {renderStatsSummary()}

                <form onSubmit={handleSaveName} className="online-field-group">
                  <label className="online-field-label" htmlFor="account-edit-name">
                    Ime koje vide drugi igrači u online duelima
                  </label>
                  <div className="online-invite-row">
                    <input
                      id="account-edit-name"
                      type="text"
                      maxLength={28}
                      className="wizard-key-input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="hud-btn active online-copy-btn"
                      disabled={busy}
                    >
                      Sačuvaj
                    </button>
                  </div>
                </form>

                {errorMsg ? <div className="online-error-banner">{errorMsg}</div> : null}
                {statusMsg ? <div className="wizard-status-msg">{statusMsg}</div> : null}
              </div>
            ) : (
              renderMatchHistory(auth.matches)
            )}
          </>
        ) : (
          <>
            <div className="online-tabs account-tabs-3">
              <button
                type="button"
                className={`online-tab-btn ${guestTab === 'login' ? 'active' : ''}`}
                onClick={() => {
                  setErrorMsg(null);
                  setStatusMsg(null);
                  setGuestTab('login');
                }}
              >
                Prijava
              </button>
              <button
                type="button"
                className={`online-tab-btn ${guestTab === 'register' ? 'active' : ''}`}
                onClick={() => {
                  setErrorMsg(null);
                  setStatusMsg(null);
                  setGuestTab('register');
                }}
              >
                Napravi nalog
              </button>
              <button
                type="button"
                className={`online-tab-btn ${guestTab === 'guest' ? 'active' : ''}`}
                onClick={() => {
                  setErrorMsg(null);
                  setStatusMsg(null);
                  setGuestTab('guest');
                }}
              >
                Gost ({auth.matches.length})
              </button>
            </div>

            {guestTab === 'login' ? (
              <form className="online-form-stack" onSubmit={handleLogin}>
                <div className="online-field-group">
                  <label className="online-field-label" htmlFor="login-username">
                    Korisničko ime ili email
                  </label>
                  <input
                    id="login-username"
                    type="text"
                    autoComplete="username"
                    className="wizard-key-input"
                    placeholder="npr. carobnjak99"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="online-field-group">
                  <label className="online-field-label" htmlFor="login-password">
                    Lozinka
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    className="wizard-key-input"
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <p className="account-merge-hint">
                  Trenutni XP i lekcije iz Akademije automatski se spajaju sa tvojim nalogom pri
                  prijavi.
                </p>
                {errorMsg ? <div className="online-error-banner">{errorMsg}</div> : null}
                <div className="wizard-modal-footer">
                  <button type="button" className="hud-btn" onClick={onClose}>
                    Nastavi kao gost
                  </button>
                  <button type="submit" className="hud-btn active" disabled={busy}>
                    {busy ? 'Prijava...' : 'Prijavi se'}
                  </button>
                </div>
              </form>
            ) : guestTab === 'register' ? (
              <form className="online-form-stack" onSubmit={handleRegister}>
                <div className="online-field-group">
                  <label className="online-field-label" htmlFor="reg-username">
                    Korisničko ime ili email
                  </label>
                  <input
                    id="reg-username"
                    type="text"
                    autoComplete="username"
                    className="wizard-key-input"
                    placeholder="slova, brojevi, . _ - @"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="online-field-group">
                  <label className="online-field-label" htmlFor="reg-displayname">
                    Ime u igri (opciono)
                  </label>
                  <input
                    id="reg-displayname"
                    type="text"
                    maxLength={28}
                    className="wizard-key-input"
                    placeholder="Kako želiš da te vide protivnici"
                    value={displayNameInput}
                    onChange={(e) => setDisplayNameInput(e.target.value)}
                  />
                </div>
                <div className="online-field-group">
                  <label className="online-field-label" htmlFor="reg-password">
                    Lozinka (minimum 6 karaktera)
                  </label>
                  <input
                    id="reg-password"
                    type="password"
                    autoComplete="new-password"
                    className="wizard-key-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="online-field-group">
                  <label className="online-field-label" htmlFor="reg-password2">
                    Potvrdi lozinku
                  </label>
                  <input
                    id="reg-password2"
                    type="password"
                    autoComplete="new-password"
                    className="wizard-key-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <p className="account-merge-hint">
                  Nalog se čuva lokalno na serveru uz bezbedno šifrovanje lozinke. Sav dosadašnji
                  napredak ostaje sačuvan.
                </p>
                {errorMsg ? <div className="online-error-banner">{errorMsg}</div> : null}
                <div className="wizard-modal-footer">
                  <button type="button" className="hud-btn" onClick={onClose}>
                    Otkaži
                  </button>
                  <button type="submit" className="hud-btn active" disabled={busy}>
                    {busy ? 'Kreiranje...' : 'Napravi nalog'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="online-form-stack">
                <form onSubmit={handleSaveName} className="online-field-group">
                  <label className="online-field-label" htmlFor="guest-edit-name">
                    Nadimak gosta za online duele
                  </label>
                  <div className="online-invite-row">
                    <input
                      id="guest-edit-name"
                      type="text"
                      maxLength={28}
                      className="wizard-key-input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                    <button type="submit" className="hud-btn active online-copy-btn">
                      Sačuvaj
                    </button>
                  </div>
                </form>

                {errorMsg ? <div className="online-error-banner">{errorMsg}</div> : null}
                {statusMsg ? <div className="wizard-status-msg">{statusMsg}</div> : null}

                {renderStatsSummary()}
                {renderMatchHistory(auth.matches)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
