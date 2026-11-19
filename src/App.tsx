import { useEffect, useRef, useState } from 'react';
import { initWizardChess } from './wizardChessEngine.js';
import { PersonaSelector } from './components/PersonaSelector';
import { AIBubble } from './components/AIBubble';
import { PlayerLevelBar } from './components/PlayerLevelBar';
import { Academy } from './components/Academy';
import { Classic2DBoard, type PromotionRequest } from './components/Classic2DBoard';
import { Chess2DPiece } from './components/Chess2DPiece';
import { PERSONAS, PersonaId, geminiService, MoveEventDetail } from './services/geminiService';
import { soundService } from './services/soundService';
import { progressionService } from './services/progressionService';
import type { SceneThemeId } from './services/sceneThemes';
import { PUZZLES, type AcademyPiece } from './services/puzzleCatalog';

type PieceSetId = 'wizard' | 'ancient' | 'dragon' | 'medieval' | 'vitez' | 'srpski' | 'srpski-kraljevski';
type AIDifficulty = 'easy' | 'medium' | 'hard';
type CameraView = 'player' | 'top';
type PromotionPieceType = 'queen' | 'rook' | 'bishop' | 'knight';

const PROMOTION_OPTIONS: { type: PromotionPieceType; label: string }[] = [
  { type: 'queen', label: 'Kraljica' },
  { type: 'rook', label: 'Top' },
  { type: 'bishop', label: 'Lovac' },
  { type: 'knight', label: 'Skakač' },
];

const PIECE_SET_ORDER: PieceSetId[] = ['wizard', 'ancient', 'dragon', 'medieval', 'vitez', 'srpski', 'srpski-kraljevski'];
const AI_DIFFICULTY_ORDER: AIDifficulty[] = ['easy', 'medium', 'hard'];
const PIECE_SET_NAMES: Record<PieceSetId, string> = {
  wizard: 'Čarobnjački',
  ancient: 'Antički',
  dragon: 'Zmajevi i vitezovi',
  medieval: 'Srednji vek',
  vitez: 'Vitez',
  srpski: 'Srpski',
  'srpski-kraljevski': 'Srpski kraljevski'
};
const AI_DIFFICULTY_NAMES: Record<AIDifficulty, string> = {
  easy: 'Lako',
  medium: 'Srednje',
  hard: 'Teško'
};

export default function App() {
  const initializedRef = useRef(false);
  const aiRequestSeqRef = useRef(0);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<PersonaId>('mentor');
  const [selectedPieceSet, setSelectedPieceSet] = useState<PieceSetId>(() => {
    try {
      const saved = localStorage.getItem('wizard_chess_piece_set');
      if (
        saved === 'ancient' ||
        saved === 'dragon' ||
        saved === 'medieval' ||
        saved === 'vitez' ||
        saved === 'srpski' ||
        saved === 'srpski-kraljevski' ||
        saved === 'wizard'
      ) {
        return saved;
      }
      return 'wizard';
    } catch (error) {
      console.warn('Chess piece set preference could not be loaded.', error);
      return 'wizard';
    }
  });
  const [isLoadingPieceSet, setIsLoadingPieceSet] = useState(false);
  const [aiDifficulty, setAIDifficulty] = useState<AIDifficulty>(() => {
    try {
      const saved = localStorage.getItem('wizard_chess_ai_difficulty');
      if (saved === 'medium' || saved === 'hard') return saved;
      return 'easy';
    } catch (error) {
      console.warn('AI difficulty preference could not be loaded.', error);
      return 'easy';
    }
  });
  const [cameraView, setCameraView] = useState<CameraView>('player');
  const selectedPersonaRef = useRef<PersonaId>('mentor');
  const [aiMessage, setAiMessage] = useState(
    'Pozdrav, šegrte! Ja sam Alistair. Tu sam da te vodim i učinim svaki potez jasnim.'
  );
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [academyVisible, setAcademyVisible] = useState(false);
  const [academyView, setAcademyView] = useState<'home' | 'puzzle'>('home');
  const [academyPuzzleId, setAcademyPuzzleId] = useState<string | null>(null);
  const [academyFeedback, setAcademyFeedback] = useState<'idle' | 'wrong' | 'solved'>('idle');
  const [academyHintCount, setAcademyHintCount] = useState(0);
  const [academyError, setAcademyError] = useState<string | null>(null);
  const [is2DMode, setIs2DMode] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState<PromotionRequest | null>(null);

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
    const aiWindow = window as Window & { wizardChess?: { setAIDifficulty?: (difficulty: AIDifficulty) => boolean } };
    if (!aiWindow.wizardChess?.setAIDifficulty?.(aiDifficulty)) {
      console.warn(`Could not apply AI difficulty: ${aiDifficulty}.`);
    }
    applySceneTheme(selectedPersonaRef.current);
  }, []);

  useEffect(() => {
    const handleCameraViewChange = (event: Event) => {
      const view = (event as CustomEvent<{ view?: CameraView }>).detail?.view;
      if (view === 'player' || view === 'top') setCameraView(view);
    };
    window.addEventListener('wizardchess:cameraview', handleCameraViewChange);
    return () => window.removeEventListener('wizardchess:cameraview', handleCameraViewChange);
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

  const handleToggleAIDifficulty = () => {
    const currentIndex = AI_DIFFICULTY_ORDER.indexOf(aiDifficulty);
    const nextDifficulty = AI_DIFFICULTY_ORDER[(currentIndex + 1) % AI_DIFFICULTY_ORDER.length];
    const aiWindow = window as Window & { wizardChess?: { setAIDifficulty?: (difficulty: AIDifficulty) => boolean } };
    if (!aiWindow.wizardChess?.setAIDifficulty?.(nextDifficulty)) {
      console.warn(`Could not switch AI difficulty to ${nextDifficulty}.`);
      return;
    }
    setAIDifficulty(nextDifficulty);
    try {
      localStorage.setItem('wizard_chess_ai_difficulty', nextDifficulty);
    } catch (error) {
      console.warn('AI difficulty preference could not be saved.', error);
    }
    setMobileSheetOpen(false);
  };

  const handleToggleCameraView = () => {
    const nextView = cameraView === 'player' ? 'top' : 'player';
    const win = window as Window & {
      wizardChess?: { setCameraPreset?: (preset: CameraView) => void };
    };
    if (!win.wizardChess?.setCameraPreset) {
      console.warn('Could not switch camera view: chess engine is unavailable.');
      return;
    }
    win.wizardChess.setCameraPreset(nextView);
    setCameraView(nextView);
    setMobileSheetOpen(false);
  };

  useEffect(() => {
    const win = window as Window & {
      wizardChess?: { set2DModeActive?: (active: boolean) => boolean };
    };
    win.wizardChess?.set2DModeActive?.(is2DMode);
  }, [is2DMode]);

  useEffect(() => {
    const handlePieceSetLoading = (event: Event) => {
      const detail = (event as CustomEvent<{ setId?: PieceSetId; loading?: boolean; failed?: boolean }>).detail;
      setIsLoadingPieceSet(Boolean(detail?.loading));
      if (detail?.failed && detail.setId) {
        setSelectedPieceSet(detail.setId);
      }
    };
    const handlePromotionReq = (event: Event) => {
      const detail = (event as CustomEvent<PromotionRequest>).detail;
      if (detail) {
        setPendingPromotion(detail);
      }
    };
    window.addEventListener('wizardchess:pieceset-loading', handlePieceSetLoading);
    window.addEventListener('wizardchess:promotion-request', handlePromotionReq);
    return () => {
      window.removeEventListener('wizardchess:pieceset-loading', handlePieceSetLoading);
      window.removeEventListener('wizardchess:promotion-request', handlePromotionReq);
    };
  }, []);

  const handleConfirmPromotion = (pieceType: PromotionPieceType) => {
    if (!pendingPromotion) return;
    const req = pendingPromotion;
    setPendingPromotion(null);
    const win = window as unknown as {
      wizardChess?: {
        executeChessMove?: (
          fromR: number,
          fromC: number,
          toR: number,
          toC: number,
          options?: { promotion?: PromotionPieceType; instant?: boolean }
        ) => boolean;
      };
    };
    win.wizardChess?.executeChessMove?.(req.fromR, req.fromC, req.toR, req.toC, {
      promotion: pieceType,
      instant: is2DMode,
    });
  };

  const handleUndoMove = async () => {
    setPendingPromotion(null);
    const win = window as unknown as { wizardChess?: { undoPlayerMove?: () => boolean } };
    const success = win.wizardChess?.undoPlayerMove?.();
    if (success) {
      soundService.playUndo();
      const reqId = ++aiRequestSeqRef.current;
      setIsLoadingAI(true);
      try {
        const reaction = await geminiService.getUndoReaction(selectedPersonaRef.current);
        if (reqId === aiRequestSeqRef.current) {
          setAiMessage(reaction);
        }
      } catch (err) {
        console.warn('Undo reaction error:', err);
      } finally {
        if (reqId === aiRequestSeqRef.current) {
          setIsLoadingAI(false);
        }
      }
    }
  };

  useEffect(() => {
    const handleMoveEvent = async (e: Event) => {
      const customEvt = e as CustomEvent<MoveEventDetail>;
      if (!customEvt.detail) return;

      const detail = customEvt.detail;
      const isPlayerMove = detail.move ? detail.move.color === detail.playerColor : false;
      const isCheckmate = Boolean(
        detail.isCheckmate ?? (detail.gameOver && detail.inCheck && !detail.drawReason)
      );
      const isDraw = Boolean(detail.gameOver && !isCheckmate);

      // Play tactical stone SFX based on move outcome
      if (isCheckmate) {
        soundService.playCheckmate();
      } else if (detail.inCheck) {
        soundService.playCheck();
      } else if (detail.move?.capture) {
        soundService.playCapture();
      } else {
        soundService.playMove();
      }

      // Award XP only for player moves; track opponent captures/checkmate separately
      if (isPlayerMove) {
        progressionService.awardMove(
          Boolean(detail.move?.capture),
          detail.inCheck,
          isCheckmate,
          isDraw
        );
      } else {
        progressionService.recordOpponentMove(Boolean(detail.move?.capture), isCheckmate);
      }

      const reqId = ++aiRequestSeqRef.current;
      setIsLoadingAI(true);
      try {
        const reaction = await geminiService.getReaction(selectedPersonaRef.current, detail);
        if (reqId === aiRequestSeqRef.current) {
          setAiMessage(reaction);
        }
      } catch (err) {
        console.warn('AI reaction error:', err);
      } finally {
        if (reqId === aiRequestSeqRef.current) {
          setIsLoadingAI(false);
        }
      }
    };

    const handleResetEvent = () => {
      aiRequestSeqRef.current += 1;
      setIsLoadingAI(false);
      setPendingPromotion(null);
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
    setIs2DMode(false);
    setPendingPromotion(null);
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
    const isTypingTarget = (target: EventTarget | null) => {
      const tag = (target as HTMLElement | null)?.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA';
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pendingPromotion) {
          setPendingPromotion(null);
        } else if (is2DMode) {
          setIs2DMode(false);
        } else {
          setMobileSheetOpen(false);
        }
      } else if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) {
        if (!academyVisible && !pendingPromotion && !isTypingTarget(e.target)) {
          e.preventDefault();
          handleUndoMove();
        }
      } else if (e.key === 'u' || e.key === 'U') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey && !academyVisible && !pendingPromotion && !isTypingTarget(e.target)) {
          handleUndoMove();
        }
      } else if (e.key === '2') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey && !academyVisible && !pendingPromotion && !isTypingTarget(e.target)) {
          setIs2DMode((prev) => !prev);
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
  }, [academyVisible, is2DMode, pendingPromotion]);

  const handleRestoreUI = () => {
    const win = window as unknown as { wizardChess?: { toggleUI?: (force?: boolean) => void } };
    if (win.wizardChess?.toggleUI) {
      win.wizardChess.toggleUI(false);
    } else {
      document.body.classList.remove('cinematic-ui-hidden');
      const btnHide = document.getElementById('btn-hide-ui');
      if (btnHide) btnHide.textContent = '👁 Sakrij [H]';
    }
  };

  const handleRequestHint = async () => {
    progressionService.awardHint();
    const reqId = ++aiRequestSeqRef.current;
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
      if (reqId === aiRequestSeqRef.current) {
        setAiMessage(hint);
      }
    } catch (err) {
      console.warn('Hint error:', err);
    } finally {
      if (reqId === aiRequestSeqRef.current) {
        setIsLoadingAI(false);
      }
    }
  };

  return (
    <>
      <div id="loading-overlay">
        <div className="loader-title">Wizard Chess</div>
        <div className="loader-bar-wrap">
          <div className="loader-bar" id="loader-bar"></div>
        </div>
        <div id="loader-text">Prizivanje katedrale i kamenih figura...</div>
      </div>

      <div id="canvas-container"></div>

      {/* Floating AI Dialogue Speech Bubble with Voice Synthesis */}
      <AIBubble
        personaId={selectedPersona}
        message={aiMessage}
        isLoading={isLoadingAI}
        onRequestHint={handleRequestHint}
      />

      <button
        type="button"
        className="hud-btn restore-ui-button"
        id="btn-mobile-show-ui"
        onClick={handleRestoreUI}
        title="Prikaži kontrole igre [H]"
        aria-label="Vrati kontrole igre"
      >
        👁 Prikaži UI
      </button>

      <div id="hud-top">
        <div className="hud-group" id="hud-left">
          <div className="brand-pill">
            <span className="brand-title">Wizard Chess</span>
          </div>

          <div className="status-pill" id="status-pill">
            <span className="turn-dot" id="turn-dot"></span>
            <span id="turn-text">Beli na potezu</span>
            <span className="mode-badge" id="mode-badge">Igraš kao beli</span>
          </div>

          {/* Gamified RPG Player Level Bar */}
          <PlayerLevelBar />

          {/* Desktop AI Persona Selector */}
          <PersonaSelector
            selectedPersona={selectedPersona}
            onSelectPersona={handleSelectPersona}
          />
        </div>

      </div>

      {/* ── Bottom Dock: 3 Capsules (Variant B) ── */}
      <div
        className={`mobile-sheet-backdrop ${mobileSheetOpen ? 'open' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          setMobileSheetOpen(false);
        }}
        aria-hidden="true"
      ></div>

      <div id="hud-dock" className={mobileSheetOpen ? 'mobile-sheet-open' : ''}>
        {/* Mobile sheet handle + header (hidden on desktop) */}
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
          <span className="mobile-sheet-title">Kontrole</span>
          <button
            type="button"
            className="mobile-sheet-close"
            id="btn-mobile-sheet-close"
            onClick={(e) => {
              e.stopPropagation();
              setMobileSheetOpen(false);
            }}
            aria-label="Zatvori kontrole"
          >
            Zatvori ✕
          </button>
        </div>

        {/* Mobile persona picker (hidden on desktop) */}
        <div className="mobile-only-persona-picker">
          <div className="mobile-sheet-section-label">AI Mentor &amp; Ličnost</div>
          <PersonaSelector
            selectedPersona={selectedPersona}
            onSelectPersona={(id) => {
              handleSelectPersona(id);
              setMobileSheetOpen(false);
            }}
          />
        </div>

        {/* ── Capsule 1: Režimi ── */}
        <div className="dock-capsule dock-modes">
          <span className="dock-capsule-label">Režimi</span>
          <button
            type="button"
            className="hud-btn academy-launch-button"
            id="btn-academy"
            onClick={() => {
              handleOpenAcademy();
              setMobileSheetOpen(false);
            }}
          >
            ✦ Akademija
          </button>
          <button
            type="button"
            className={`hud-btn btn-toggle-2d ${is2DMode ? 'active' : ''}`}
            id="btn-toggle-2d"
            title="Prebaci u klasičnu 2D tablu (Prečica: 2)"
            onClick={() => {
              setIs2DMode((prev) => !prev);
              setMobileSheetOpen(false);
            }}
          >
            {is2DMode ? '🏰 3D' : '⬚ 2D'}
          </button>
        </div>

        {/* ── Capsule 2: Partija (centar) ── */}
        <div className="dock-capsule dock-game">
          <span className="dock-capsule-label">Partija</span>
          <button
            className="hud-btn"
            id="btn-undo-move"
            title="Vrati prethodni potez (Prečica: U ili Ctrl+Z)"
            onClick={() => {
              handleUndoMove();
              setMobileSheetOpen(false);
            }}
          >
            ⏳ Vrati
          </button>
          <button
            className="hud-btn"
            id="btn-ai-move"
            title="Neka AI odigra sledeći potez"
            onClick={() => setMobileSheetOpen(false)}
          >
            ⚡ AI
          </button>
          <button
            className="hud-btn"
            id="btn-reset"
            title="Započni novu partiju"
            onClick={() => setMobileSheetOpen(false)}
          >
            🔄 Nova
          </button>
        </div>

        {/* ── Capsule 3: Podešavanja ── */}
        <div className="dock-capsule dock-settings">
          <span className="dock-capsule-label">Podešavanja</span>
          <button
            type="button"
            className="hud-btn"
            id="btn-piece-set"
            title="Promeni izgled šahovskih figura"
            aria-label={`Promeni set figura. Trenutni set: ${PIECE_SET_NAMES[selectedPieceSet]}`}
            onClick={handleTogglePieceSet}
            disabled={isLoadingPieceSet}
          >
            {isLoadingPieceSet ? `⏳ ${PIECE_SET_NAMES[selectedPieceSet]}...` : `♟ ${PIECE_SET_NAMES[selectedPieceSet]}`}
          </button>
          <button
            type="button"
            className="hud-btn"
            id="btn-ai-difficulty"
            title="Promeni težinu protivnika"
            aria-label={`Promeni težinu AI protivnika. Trenutna težina: ${AI_DIFFICULTY_NAMES[aiDifficulty]}`}
            onClick={handleToggleAIDifficulty}
          >
            ⚔ {AI_DIFFICULTY_NAMES[aiDifficulty]}
          </button>
          <button
            className="hud-btn"
            id="btn-side-toggle"
            title="Igraj kao beli ili crni"
            onClick={() => setMobileSheetOpen(false)}
          >
            ⮂ Igraj crnim
          </button>
          <button
            type="button"
            className={`hud-btn ${cameraView === 'player' || cameraView === 'top' ? 'active' : ''}`}
            id="btn-camera-view"
            title="Prebaci kameru između igrača i pogleda odozgo"
            aria-label={`Pogled kamere: ${cameraView === 'player' ? 'Igrač' : 'Odozgo'}. Klikni za promenu pogleda.`}
            onClick={handleToggleCameraView}
          >
            🎥 {cameraView === 'player' ? 'Igrač' : 'Odozgo'}
          </button>
          <button
            className="hud-btn"
            id="btn-hide-ui"
            title="Sakrij/prikaži interfejs (Prečica: H)"
            onClick={() => setMobileSheetOpen(false)}
          >
            👁 Sakrij [H]
          </button>
        </div>

        {/* Mobile touch hint (hidden on desktop) */}
        <div className="mobile-sheet-hint">
          <strong>Dodir:</strong> Tap za potez &nbsp;•&nbsp; 1 prst: Rotacija &nbsp;•&nbsp; 2 prsta: Pan &nbsp;•&nbsp; Pinch: Zoom
        </div>
      </div>

      {/* Mobile controls trigger button (visible only on mobile) */}
      <button
        type="button"
        className={`hud-btn mobile-controls-trigger ${mobileSheetOpen ? 'active' : ''}`}
        id="btn-mobile-controls"
        aria-expanded={mobileSheetOpen}
        aria-controls="hud-dock"
        onClick={() => setMobileSheetOpen((prev) => !prev)}
      >
        {mobileSheetOpen ? '✕' : '☰'}
      </button>

      <div id="hud-bottom">
        <div className="hint-pill" id="controls-hint">
          <strong>Kontrole:</strong> Klik za potez &nbsp;•&nbsp; ⏳ U / Ctrl+Z: Vrati potez &nbsp;•&nbsp; Rotacija &nbsp;•&nbsp; Pan &nbsp;•&nbsp; Zoom &nbsp;•&nbsp; H: Sakrij UI
        </div>
        <div className="captured-pill" id="captured-tray"></div>
      </div>

      <div id="checkmate-overlay" role="status" aria-live="polite">
        <div className="checkmate-banner">
          <div className="checkmate-ornament">✦ &nbsp; Presuda Sanctuma &nbsp; ✦</div>
          <div className="checkmate-crown" id="checkmate-crown">♔</div>
          <div className="checkmate-title" id="checkmate-title">Šah-mat</div>
          <div className="checkmate-rule"></div>
          <div className="checkmate-subtitle" id="checkmate-subtitle">
            Beli trijumfuje • Pao je crni kralj
          </div>
          <div className="checkmate-actions">
            <button className="checkmate-btn" id="btn-checkmate-replay">
              Ponovi pad kralja
            </button>
            <button className="checkmate-btn" id="btn-checkmate-newgame">
              Nova partija
            </button>
            <button className="checkmate-btn secondary" id="btn-checkmate-dismiss">
              Zatvori
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

      <Classic2DBoard
        isOpen={is2DMode}
        onClose={() => setIs2DMode(false)}
        onUndoMove={handleUndoMove}
        onRequestPromotion={setPendingPromotion}
      />

      {pendingPromotion ? (
        <div
          className="promotion-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Izbor figure za promociju pešaka"
          onClick={() => setPendingPromotion(null)}
        >
          <div className="promotion-modal" onClick={(e) => e.stopPropagation()}>
            <div className="promotion-modal-eyebrow">PROMOCIJA PEŠAKA</div>
            <h3 className="promotion-modal-title">Izaberi novu figuru</h3>
            <div className="promotion-options-grid">
              {PROMOTION_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  className="promotion-option-btn"
                  onClick={() => handleConfirmPromotion(opt.type)}
                >
                  <div className="promotion-option-icon">
                    <Chess2DPiece type={opt.type} color={pendingPromotion.color} />
                  </div>
                  <span className="promotion-option-label">{opt.label}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="promotion-cancel-btn"
              onClick={() => setPendingPromotion(null)}
            >
              Otkaži [Esc]
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
