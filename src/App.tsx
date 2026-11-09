import { useEffect, useRef, useState } from 'react';
import { initWizardChess } from './wizardChessEngine.js';
import { PersonaSelector } from './components/PersonaSelector';
import { AIBubble } from './components/AIBubble';
import { ApiKeyModal } from './components/ApiKeyModal';
import { PlayerLevelBar } from './components/PlayerLevelBar';
import { Academy } from './components/Academy';
import { PERSONAS, PersonaId, geminiService, MoveEventDetail } from './services/geminiService';
import { progressionService } from './services/progressionService';
import type { SceneThemeId } from './services/sceneThemes';
import { PUZZLES, type AcademyPiece } from './services/puzzleCatalog';

type PieceSetId = 'wizard' | 'ancient' | 'dragon';

const PIECE_SET_ORDER: PieceSetId[] = ['wizard', 'ancient', 'dragon'];
const PIECE_SET_NAMES: Record<PieceSetId, string> = {
  wizard: 'Čarobnjački',
  ancient: 'Antički',
  dragon: 'Zmajevi i vitezovi'
};

export default function App() {
  const initializedRef = useRef(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<PersonaId>('mentor');
  const [selectedPieceSet, setSelectedPieceSet] = useState<PieceSetId>(() => {
    try {
      const saved = localStorage.getItem('wizard_chess_piece_set');
      if (saved === 'ancient' || saved === 'dragon' || saved === 'wizard') return saved;
      return 'wizard';
    } catch (error) {
      console.warn('Chess piece set preference could not be loaded.', error);
      return 'wizard';
    }
  });
  const selectedPersonaRef = useRef<PersonaId>('mentor');
  const [aiMessage, setAiMessage] = useState(
    'Pozdrav, šegrte! Ja sam Alistair. Tu sam da te vodim i učinim svaki potez jasnim.'
  );
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [academyVisible, setAcademyVisible] = useState(false);
  const [academyView, setAcademyView] = useState<'home' | 'puzzle'>('home');
  const [academyPuzzleId, setAcademyPuzzleId] = useState<string | null>(null);
  const [academyFeedback, setAcademyFeedback] = useState<'idle' | 'wrong' | 'solved'>('idle');
  const [academyHintCount, setAcademyHintCount] = useState(0);
  const [academyError, setAcademyError] = useState<string | null>(null);

  const applySceneTheme = (themeId: SceneThemeId) => {
    const win = window as Window & {
      wizardChess?: { setSceneTheme?: (id: SceneThemeId) => boolean };
    };
    const applied = win.wizardChess?.setSceneTheme?.(themeId);
    if (applied === false) {
      console.warn(`Could not apply scene theme: ${themeId}`);
    }
  };

  const handleSelectPersona = (id: PersonaId) => {
    setSelectedPersona(id);
    selectedPersonaRef.current = id;
    applySceneTheme(id);
    const p = PERSONAS[id];
    if (id === 'mentor') {
      setAiMessage(`Pozdrav, šegrte! Ja sam ${p.name}. Tu sam da te vodim i učinim svaki potez jasnim.`);
    } else if (id === 'roast') {
      setAiMessage(`Oho, stigao novi izazivač! Ja sam ${p.name}. Pazi šta vučeš, jer ne praštam blundere!`);
    } else {
      setAiMessage(`Ja sam ${p.name}, nepobedivi vitez sanctuma! Da vidimo da li imaš hrabrosti.`);
    }
  };

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    initWizardChess();
    const pieceSetWindow = window as Window & { wizardChess?: { setPieceSet?: (id: PieceSetId) => boolean } };
    pieceSetWindow.wizardChess?.setPieceSet?.(selectedPieceSet);
    applySceneTheme(selectedPersonaRef.current);
  }, []);

  const handleTogglePieceSet = () => {
    const currentIndex = PIECE_SET_ORDER.indexOf(selectedPieceSet);
    const nextPieceSet = PIECE_SET_ORDER[(currentIndex + 1) % PIECE_SET_ORDER.length];
    const pieceSetWindow = window as Window & { wizardChess?: { setPieceSet?: (id: PieceSetId) => boolean } };
    if (!pieceSetWindow.wizardChess?.setPieceSet?.(nextPieceSet)) {
      console.warn(`Could not switch chess piece set to ${nextPieceSet}.`);
      return;
    }
    setSelectedPieceSet(nextPieceSet);
    try {
      localStorage.setItem('wizard_chess_piece_set', nextPieceSet);
    } catch (error) {
      console.warn('Chess piece set preference could not be saved.', error);
    }
    setMobileSheetOpen(false);
  };

  const handleUndoMove = async () => {
    const win = window as unknown as { wizardChess?: { undoPlayerMove?: () => boolean } };
    const success = win.wizardChess?.undoPlayerMove?.();
    if (success) {
      setIsLoadingAI(true);
      try {
        const reaction = await geminiService.getUndoReaction(selectedPersonaRef.current);
        setAiMessage(reaction);
      } catch (err) {
        console.warn('Undo reaction error:', err);
      } finally {
        setIsLoadingAI(false);
      }
    }
  };

  useEffect(() => {
    const handleMoveEvent = async (e: Event) => {
      const customEvt = e as CustomEvent<MoveEventDetail>;
      if (!customEvt.detail) return;

      // Award XP to player when a move completes
      progressionService.awardMove(
        Boolean(customEvt.detail.move?.capture),
        customEvt.detail.inCheck,
        customEvt.detail.gameOver
      );

      setIsLoadingAI(true);
      try {
        const reaction = await geminiService.getReaction(
          selectedPersonaRef.current,
          customEvt.detail
        );
        setAiMessage(reaction);
      } catch (err) {
        console.warn('AI reaction error:', err);
      } finally {
        setIsLoadingAI(false);
      }
    };

    const handleResetEvent = () => {
      const p = PERSONAS[selectedPersonaRef.current];
      setAiMessage(`Nova partija je započeta na oltaru! ${p.name} je spreman za tvoj potez.`);
    };

    window.addEventListener('wizardchess:move', handleMoveEvent);
    window.addEventListener('wizardchess:reset', handleResetEvent);

    return () => {
      window.removeEventListener('wizardchess:move', handleMoveEvent);
      window.removeEventListener('wizardchess:reset', handleResetEvent);
    };
  }, []);

  useEffect(() => {
    const handleAcademyMove = (e: Event) => {
      const detail = (e as CustomEvent<{ isCheckmate?: boolean }>).detail;
      setAcademyFeedback(detail?.isCheckmate ? 'solved' : 'wrong');
    };
    window.addEventListener('wizardchess:academy-move', handleAcademyMove);
    return () => window.removeEventListener('wizardchess:academy-move', handleAcademyMove);
  }, []);

  const handleOpenAcademy = () => {
    setAcademyView('home');
    setAcademyPuzzleId(null);
    setAcademyFeedback('idle');
    setAcademyHintCount(0);
    setAcademyError(null);
    setAcademyVisible(true);
  };

  const handleStartPuzzle = (id: string) => {
    const puzzle = PUZZLES.find((item) => item.id === id);
    const win = window as Window & {
      wizardChess?: {
        enterAcademy?: (pieces: AcademyPiece[], turn: 'w' | 'b') => boolean;
      };
    };
    if (!puzzle || !win.wizardChess?.enterAcademy?.(puzzle.pieces, puzzle.turn)) {
      setAcademyError('Zadatak nije mogao da se učita. Pokušaj ponovo ili se vrati u partiju.');
      return;
    }
    setAcademyView('puzzle');
    setAcademyPuzzleId(id);
    setAcademyFeedback('idle');
    setAcademyHintCount(0);
    setAcademyError(null);
  };

  const handleRetryPuzzle = () => {
    const puzzle = PUZZLES.find((item) => item.id === academyPuzzleId);
    const win = window as Window & {
      wizardChess?: {
        setAcademyPosition?: (pieces: AcademyPiece[], turn: 'w' | 'b') => boolean;
      };
    };
    if (!puzzle || !win.wizardChess?.setAcademyPosition?.(puzzle.pieces, puzzle.turn)) {
      setAcademyError('Zagonetka nije mogla da se resetuje.');
      return;
    }
    setAcademyFeedback('idle');
    setAcademyHintCount(0);
    setAcademyError(null);
  };

  const handleNextPuzzle = () => {
    const currentIndex = PUZZLES.findIndex((puzzle) => puzzle.id === academyPuzzleId);
    const nextPuzzle = PUZZLES[currentIndex + 1];
    const win = window as Window & {
      wizardChess?: {
        setAcademyPosition?: (pieces: AcademyPiece[], turn: 'w' | 'b') => boolean;
      };
    };
    if (!nextPuzzle || !win.wizardChess?.setAcademyPosition?.(nextPuzzle.pieces, nextPuzzle.turn)) {
      setAcademyError('Sledeća zagonetka nije mogla da se učita. Pokušaj ponovo ili izađi iz Akademije.');
      return;
    }
    setAcademyPuzzleId(nextPuzzle.id);
    setAcademyFeedback('idle');
    setAcademyHintCount(0);
    setAcademyError(null);
  };

  const handleCloseAcademy = () => {
    if (academyView === 'puzzle') {
      const win = window as Window & { wizardChess?: { exitAcademy?: () => boolean } };
      if (!win.wizardChess?.exitAcademy?.()) {
        setAcademyError('Partija nije mogla automatski da se vrati. Osveži stranicu samo ako je tabla ostala zaglavljena.');
        return;
      }
    }
    setAcademyVisible(false);
    setAcademyError(null);
  };

  const handleLeavePuzzle = () => {
    const win = window as Window & { wizardChess?: { exitAcademy?: () => boolean } };
    if (!win.wizardChess?.exitAcademy?.()) {
      setAcademyError('Partija nije mogla automatski da se vrati. Pokušaj ponovo ili izađi iz Akademije.');
      return;
    }
    setAcademyView('home');
    setAcademyPuzzleId(null);
    setAcademyFeedback('idle');
    setAcademyHintCount(0);
    setAcademyError(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileSheetOpen(false);
      } else if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleUndoMove();
      } else if (e.key === 'u' || e.key === 'U') {
        // Prevent undo shortcut when typing in input
        if ((e.target as HTMLElement)?.tagName !== 'INPUT') {
          handleUndoMove();
        }
      }
    };
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileSheetOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleRestoreUI = () => {
    const win = window as unknown as { wizardChess?: { toggleUI?: (force?: boolean) => void } };
    if (win.wizardChess?.toggleUI) {
      win.wizardChess.toggleUI(false);
    } else {
      document.body.classList.remove('cinematic-ui-hidden');
      const btnHide = document.getElementById('btn-hide-ui');
      if (btnHide) btnHide.textContent = 'Hide UI [H]';
    }
  };

  const handleRequestHint = async () => {
    progressionService.awardHint();
    setIsLoadingAI(true);
    try {
      const win = window as unknown as {
        wizardChess?: {
          getGameContext?: () => {
            currentTurn: 'w' | 'b';
            legalMovesSummary?: string[];
          };
        };
      };
      const ctx = win.wizardChess?.getGameContext?.();
      const hint = await geminiService.getHint(
        selectedPersonaRef.current,
        ctx?.currentTurn || 'w',
        ctx?.legalMovesSummary
      );
      setAiMessage(hint);
    } catch (err) {
      console.warn('Hint error:', err);
    } finally {
      setIsLoadingAI(false);
    }
  };

  return (
    <>
      <div id="loading-overlay">
        <div className="loader-title">Wizard Chess</div>
        <div className="loader-bar-wrap">
          <div className="loader-bar" id="loader-bar"></div>
        </div>
        <div id="loader-text">Summoning Sanctum Architecture &amp; Sculpted Pieces...</div>
      </div>

      <div id="canvas-container"></div>

      {/* Floating AI Dialogue Speech Bubble with Voice Synthesis */}
      <AIBubble
        personaId={selectedPersona}
        message={aiMessage}
        isLoading={isLoadingAI}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onRequestHint={handleRequestHint}
      />

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onSaved={() => {
          const p = PERSONAS[selectedPersona];
          setAiMessage(`✨ Gemini AI je uspešno aktiviran! ${p.name} je spreman za direktan razgovor.`);
        }}
      />

      <button
        type="button"
        className="hud-btn mobile-only-restore-ui"
        id="btn-mobile-show-ui"
        onClick={handleRestoreUI}
        title="Show HUD Controls"
      >
        Show UI
      </button>

      <div id="hud-top">
        <div className="hud-group" id="hud-left">
          <div className="brand-pill">
            <span className="brand-title">Wizard Chess</span>
          </div>

          <div className="status-pill" id="status-pill">
            <span className="turn-dot" id="turn-dot"></span>
            <span id="turn-text">White to Move</span>
            <span className="mode-badge" id="mode-badge">Playing as White</span>
          </div>

          {/* Gamified RPG Player Level Bar */}
          <PlayerLevelBar />

          {/* Desktop AI Persona Selector */}
          <PersonaSelector
            selectedPersona={selectedPersona}
            onSelectPersona={handleSelectPersona}
          />
        </div>

        <button
          type="button"
          className={`hud-btn mobile-controls-trigger ${mobileSheetOpen ? 'active' : ''}`}
          id="btn-mobile-controls"
          aria-expanded={mobileSheetOpen}
          aria-controls="hud-right"
          onClick={() => setMobileSheetOpen((prev) => !prev)}
        >
          {mobileSheetOpen ? 'Close' : 'Controls'}
        </button>

        <div
          className={`mobile-sheet-backdrop ${mobileSheetOpen ? 'open' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setMobileSheetOpen(false);
          }}
          aria-hidden="true"
        ></div>

        <div
          className={`hud-group ${mobileSheetOpen ? 'mobile-sheet-open' : ''}`}
          id="hud-right"
        >
          <div
            className="mobile-sheet-handle-wrap"
            onClick={(e) => {
              e.stopPropagation();
              setMobileSheetOpen(false);
            }}
            aria-hidden="true"
          >
            <div className="mobile-sheet-handle"></div>
          </div>

          <div className="mobile-sheet-header">
            <span className="mobile-sheet-title">Controls</span>
            <button
              type="button"
              className="mobile-sheet-close"
              id="btn-mobile-sheet-close"
              onClick={(e) => {
                e.stopPropagation();
                setMobileSheetOpen(false);
              }}
              aria-label="Close Controls"
            >
              Close ✕
            </button>
          </div>

          {/* Mobile-Only Persona Selector (Hidden on Desktop) */}
          <div className="mobile-only-persona-picker">
            <div className="mobile-sheet-section-label">AI Mentor &amp; Ličnost</div>
            <PersonaSelector
              selectedPersona={selectedPersona}
              onSelectPersona={(id) => {
                handleSelectPersona(id);
                setMobileSheetOpen(false);
              }}
            />
            <div className="hud-divider" aria-hidden="true"></div>
          </div>
          <div className="mobile-sheet-section-label">Game Actions</div>

          <button
            type="button"
            className="hud-btn academy-launch-button"
            id="btn-academy"
            onClick={() => {
              handleOpenAcademy();
              setMobileSheetOpen(false);
            }}
          >
            ✦ Šahovska akademija
          </button>
          <button
            type="button"
            className="hud-btn"
            id="btn-piece-set"
            title="Promeni izgled šahovskih figura"
            aria-label={`Promeni set figura. Trenutni set: ${PIECE_SET_NAMES[selectedPieceSet]}`}
            onClick={handleTogglePieceSet}
          >
            ♟ Set figura: {PIECE_SET_NAMES[selectedPieceSet]}
          </button>
          <button
            className="hud-btn"
            id="btn-side-toggle"
            title="Switch between Playing as White and Playing as Black"
            onClick={() => setMobileSheetOpen(false)}
          >
            Play as Black
          </button>
          <button
            className="hud-btn"
            id="btn-ai-move"
            title="Let the AI make the next move immediately"
            onClick={() => setMobileSheetOpen(false)}
          >
            AI Move
          </button>
          <button
            className="hud-btn"
            id="btn-undo-move"
            title="Vrati prethodni potez (Prečica: U ili Ctrl+Z)"
            onClick={() => {
              handleUndoMove();
              setMobileSheetOpen(false);
            }}
          >
            ⏳ Vrati potez
          </button>
          <button
            className="hud-btn"
            id="btn-reset"
            title="Start a fresh game on the altar"
            onClick={() => setMobileSheetOpen(false)}
          >
            New Game
          </button>

          <div className="hud-divider" aria-hidden="true"></div>
          <div className="mobile-sheet-section-label">
            <span>Camera Views</span>
            <span className="mobile-sheet-section-sub">Tap active view to flip</span>
          </div>

          <button
            className="hud-btn active"
            id="btn-cam-player"
            title="Player Camera (Click again to flip White / Black view)"
          >
            Player Cam
          </button>
          <button
            className="hud-btn"
            id="btn-cam-top"
            title="Overhead Board View (Click again to flip White / Black orientation)"
          >
            Overhead
          </button>
          <button
            className="hud-btn"
            id="btn-cam-side"
            title="Side Profile View (Click again to switch East / West side)"
          >
            Side
          </button>
          <button
            className="hud-btn"
            id="btn-cam-wide"
            title="Wide Cathedral View (Click again to switch North Rose / South Narthex)"
          >
            Cathedral
          </button>

          <div className="hud-divider" aria-hidden="true"></div>
          <div className="mobile-sheet-section-label">Display &amp; Gestures</div>

          <button
            className="hud-btn"
            id="btn-hide-ui"
            title="Toggle HUD visibility (Shortcut: H)"
            onClick={() => setMobileSheetOpen(false)}
          >
            Hide UI [H]
          </button>

          <div className="mobile-sheet-hint">
            <strong>Touch:</strong> Tap Piece to Move &nbsp;•&nbsp; 1-Finger Drag: Orbit &nbsp;•&nbsp; 2-Finger Drag: Pan &nbsp;•&nbsp; Pinch: Zoom
          </div>
        </div>
      </div>

      <div id="hud-bottom">
        <div className="hint-pill" id="controls-hint">
          <strong>Kontrole:</strong> Klik za potez &nbsp;•&nbsp; ⏳ U / Ctrl+Z: Vrati potez &nbsp;•&nbsp; Rotacija &nbsp;•&nbsp; Pan &nbsp;•&nbsp; Zoom &nbsp;•&nbsp; H: Sakrij UI
        </div>
        <div className="captured-pill" id="captured-tray"></div>
      </div>

      <div id="checkmate-overlay" role="status" aria-live="polite">
        <div className="checkmate-banner">
          <div className="checkmate-ornament">✦ &nbsp; Sanctum Judgment &nbsp; ✦</div>
          <div className="checkmate-crown" id="checkmate-crown">♔</div>
          <div className="checkmate-title" id="checkmate-title">Checkmate</div>
          <div className="checkmate-rule"></div>
          <div className="checkmate-subtitle" id="checkmate-subtitle">
            White Triumphs • The Black King Has Fallen
          </div>
          <div className="checkmate-actions">
            <button className="checkmate-btn" id="btn-checkmate-replay">
              Replay King Fall
            </button>
            <button className="checkmate-btn" id="btn-checkmate-newgame">
              New Game
            </button>
            <button className="checkmate-btn secondary" id="btn-checkmate-dismiss">
              Dismiss
            </button>
          </div>
        </div>
      </div>

      {academyVisible ? (
        <Academy
          view={academyView}
          puzzleId={academyPuzzleId}
          feedback={academyFeedback}
          hintCount={academyHintCount}
          error={academyError}
          onClose={handleCloseAcademy}
          onOpenPuzzle={handleStartPuzzle}
          onNextPuzzle={handleNextPuzzle}
          onLeavePuzzle={handleLeavePuzzle}
          hasNextPuzzle={PUZZLES.findIndex((puzzle) => puzzle.id === academyPuzzleId) < PUZZLES.length - 1}
          onShowHint={() => setAcademyHintCount((count) => Math.min(count + 1, 3))}
          onRetry={handleRetryPuzzle}
        />
      ) : null}
    </>
  );
}
