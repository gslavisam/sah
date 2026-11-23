import { useEffect, useRef, useState } from 'react';
import { initWizardChess } from './wizardChessEngine.js';
import { PersonaSelector } from './components/PersonaSelector';
import { AIBubble } from './components/AIBubble';
import { PlayerLevelBar } from './components/PlayerLevelBar';
import { Academy } from './components/Academy';
import { Classic2DBoard, type PromotionRequest } from './components/Classic2DBoard';
import { Chess2DPiece } from './components/Chess2DPiece';
import { OnlineDuelModal } from './components/OnlineDuelModal';
import { OnlineMatchBar } from './components/OnlineMatchBar';
import { AccountModal } from './components/AccountModal';
import { EvalBar } from './components/EvalBar';
import { PERSONAS, PersonaId, geminiService, MoveEventDetail, type StockfishHintContext } from './services/geminiService';
import { soundService } from './services/soundService';
import { progressionService } from './services/progressionService';
import { authService, type AuthSnapshot } from './services/authService';
import { multiplayerService, type OnlineSessionSnapshot } from './services/multiplayerService';
import { stockfishService } from './services/stockfishService';
import { voiceService, type VoiceCue } from './services/voiceService';
import type { SceneThemeId } from './services/sceneThemes';
import type { OnlinePersonaId, PreferredSide, TimeControlId } from './shared/multiplayerTypes';
import { PUZZLES, type AcademyPiece } from './services/puzzleCatalog';
import { academyProgression } from './services/academyProgression';
import {
  CHESS_ACADEMY_LESSONS,
  type AcademyCategory,
  type ChessAcademyLesson,
  type GameEducationalBrief
} from './data/chessAcademyLessons';
import {
  downloadPgnFile,
  exportMovesToPgn,
  loadCustomPgnLessons,
  parsePgnToLesson,
  persistCustomPgnLessons,
  reconstructLessonFen,
  type GameExportSnapshot
} from './services/pgnService';
import {
  STOCKFISH_DIFFICULTY_ORDER,
  classifyPlayerMoveQuality,
  evalToDisplay,
  getStockfishEloProfile,
  normalizeStockfishDifficulty,
  type StockfishDifficulty,
  type StockfishEval,
} from './shared/chessRules';

type PieceSetId = 'wizard' | 'ancient' | 'dragon' | 'medieval' | 'vitez' | 'srpski' | 'klasicni';
type AIDifficulty = StockfishDifficulty;
type CameraView = 'player' | 'top';
type PromotionPieceType = 'queen' | 'rook' | 'bishop' | 'knight';
type AmbienceMode = 'cathedral' | 'park';

const PROMOTION_OPTIONS: { type: PromotionPieceType; label: string }[] = [
  { type: 'queen', label: 'Kraljica' },
  { type: 'rook', label: 'Top' },
  { type: 'bishop', label: 'Lovac' },
  { type: 'knight', label: 'Skakač' },
];

const PIECE_SET_ORDER: PieceSetId[] = ['klasicni', 'wizard', 'ancient', 'dragon', 'medieval', 'vitez', 'srpski'];
const AI_DIFFICULTY_ORDER: AIDifficulty[] = STOCKFISH_DIFFICULTY_ORDER;
const PIECE_SET_NAMES: Record<PieceSetId, string> = {
  wizard: 'Čarobnjački',
  ancient: 'Antički',
  dragon: 'Zmajevi i vitezovi',
  medieval: 'Srednji vek',
  vitez: 'Vitez',
  srpski: 'Srpski',
  klasicni: 'Klasični'
};
const AI_DIFFICULTY_NAMES: Record<AIDifficulty, string> = {
  beginner: 'Početnik',
  casual: 'Rekreativac',
  intermediate: 'Srednji',
  advanced: 'Napredni',
  master: 'Majstor',
};
const AI_DIFFICULTY_DESCRIPTIONS: Record<AIDifficulty, string> = {
  beginner: 'Opuštena igra i učenje',
  casual: 'Zanimljiva partija uz poneku grešku',
  intermediate: 'Klupski standard (Stockfish)',
  advanced: 'Jaka taktika i pritisak',
  master: 'Ozbiljan majstorski izazov',
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
        saved === 'klasicni' ||
        saved === 'wizard'
      ) {
        return saved;
      }
      return 'klasicni';
    } catch (error) {
      console.warn('Chess piece set preference could not be loaded.', error);
      return 'klasicni';
    }
  });
  const [isLoadingPieceSet, setIsLoadingPieceSet] = useState(false);
  const [aiDifficulty, setAIDifficulty] = useState<AIDifficulty>(() => {
    try {
      const saved = localStorage.getItem('wizard_chess_ai_difficulty');
      return normalizeStockfishDifficulty(saved, 'casual');
    } catch (error) {
      console.warn('AI difficulty preference could not be loaded.', error);
      return 'casual';
    }
  });
  const [difficultyMenuOpen, setDifficultyMenuOpen] = useState(false);
  const difficultyMenuRef = useRef<HTMLDivElement | null>(null);
  const [cameraView, setCameraView] = useState<CameraView>('player');
  const selectedPersonaRef = useRef<PersonaId>('mentor');
  const [aiMessage, setAiMessage] = useState(
    'Pozdrav, šegrte! Ja sam Alistair. Tu sam da te vodim i učinim svaki potez jasnim.'
  );
  const [aiVoiceCue, setAiVoiceCue] = useState<VoiceCue | undefined>(undefined);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [evalState, setEvalState] = useState<StockfishEval | null>({ whiteCp: 0, mateIn: null });
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const evalBeforeRef = useRef<StockfishEval>({ whiteCp: 0, mateIn: null });
  const evalReqSeqRef = useRef(0);
  const [academyVisible, setAcademyVisible] = useState(false);
  const academyVisibleRef = useRef(academyVisible);
  academyVisibleRef.current = academyVisible;
  const [academyView, setAcademyView] = useState<'home' | 'puzzle' | 'tutorial'>('home');
  const [academyPuzzleId, setAcademyPuzzleId] = useState<string | null>(null);
  const [academyFeedback, setAcademyFeedback] = useState<'idle' | 'wrong' | 'solved'>('idle');
  const [academyHintCount, setAcademyHintCount] = useState(0);
  const [academyError, setAcademyError] = useState<string | null>(null);
  const [tutorialLessonId, setTutorialLessonId] = useState<string>(CHESS_ACADEMY_LESSONS[0].id);
  const tutorialLessonIdRef = useRef<string>(tutorialLessonId);
  tutorialLessonIdRef.current = tutorialLessonId;
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const tutorialStepIndexRef = useRef(0);
  tutorialStepIndexRef.current = tutorialStepIndex;
  const [tutorialAnimating, setTutorialAnimating] = useState(false);
  const [tutorialGameOver, setTutorialGameOver] = useState(false);
  const [tutorialAutoPlay, setTutorialAutoPlay] = useState(false);
  const tutorialAnimTimerRef = useRef<number | null>(null);
  const [customLessons, setCustomLessons] = useState<ChessAcademyLesson[]>(() =>
    loadCustomPgnLessons()
  );
  const customLessonsRef = useRef<ChessAcademyLesson[]>(customLessons);
  customLessonsRef.current = customLessons;
  const [hasPlayedMoves, setHasPlayedMoves] = useState(false);
  const [is2DMode, setIs2DMode] = useState(false);
  const [guidedMode, setGuidedMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('wizard_chess_guided_mode') === '1';
    } catch {
      return false;
    }
  });
  const guidedModeRef = useRef(guidedMode);
  guidedModeRef.current = guidedMode;
  const guidedReqSeqRef = useRef(0);
  const [ambience, setAmbience] = useState<AmbienceMode>(() => {
    try {
      const saved = localStorage.getItem('wizard_chess_ambience');
      if (saved === 'cathedral' || saved === 'park') return saved;
      return 'park';
    } catch {
      return 'park';
    }
  });
  const [pendingPromotion, setPendingPromotion] = useState<PromotionRequest | null>(null);
  const [onlineSession, setOnlineSession] = useState<OnlineSessionSnapshot>(() =>
    multiplayerService.getSnapshot()
  );
  const [onlineModalOpen, setOnlineModalOpen] = useState(false);
  const [onlineModalTab, setOnlineModalTab] = useState<'create' | 'join'>('create');
  const [onlineJoinCode, setOnlineJoinCode] = useState('');
  const [authSnap, setAuthSnap] = useState<AuthSnapshot>(() => authService.getSnapshot());
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const isOnlineMode = Boolean(onlineSession.roomId && onlineSession.roomState);
  const isOnlineModeRef = useRef(isOnlineMode);
  isOnlineModeRef.current = isOnlineMode;
  const lastOnlineOpponentAvatarRef = useRef<string | null>(null);

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
    setAiVoiceCue(undefined);
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
    const ambienceWindow = window as Window & {
      wizardChess?: { setAmbienceMode?: (mode: AmbienceMode) => AmbienceMode };
    };
    ambienceWindow.wizardChess?.setAmbienceMode?.(ambience);
    voiceService.setAmbienceMuted(ambience === 'park');
    if (guidedModeRef.current) {
      window.setTimeout(() => {
        void runMoveHint({ isGuided: true, awardXp: false });
      }, 180);
    }
  }, []);

  useEffect(() => {
    if (!isOnlineMode) {
      void stockfishService.init();
    }
    return () => {
      stockfishService.terminate();
    };
  }, [isOnlineMode]);

  useEffect(() => {
    if (!isLoadingAI) return;
    const watchdog = setTimeout(() => {
      setIsLoadingAI(false);
    }, 9000);
    return () => clearTimeout(watchdog);
  }, [isLoadingAI]);

  useEffect(() => {
    void authService.init();
    const unsubAuth = authService.subscribe(setAuthSnap);
    const unsubscribe = multiplayerService.subscribe((snap) => {
      setOnlineSession(snap);
    });

    multiplayerService.setEventHandlers({
      onRoomEntered: (yourColor, state, isRematch) => {
        setAcademyVisible(false);
        setPendingPromotion(null);
        aiRequestSeqRef.current += 1;
        guidedReqSeqRef.current += 1;
        setIsLoadingAI(false);
        evalReqSeqRef.current += 1;
        stockfishService.cancelPending();
        setEvalState(null);
        setIsEvaluating(false);
        setAiVoiceCue(undefined);
        setPlayerColor(yourColor);
        const win = window as Window & {
          wizardChess?: {
            enterOnlineMode?: (roomState: typeof state, assignedColor: typeof yourColor) => boolean;
          };
        };
        win.wizardChess?.enterOnlineMode?.(state, yourColor);

        const oppCol = yourColor === 'w' ? 'b' : 'w';
        const oppAvatar = state.players[oppCol]?.avatar;
        if (oppAvatar) {
          lastOnlineOpponentAvatarRef.current = oppAvatar;
          setSelectedPersona(oppAvatar);
          selectedPersonaRef.current = oppAvatar;
        } else {
          lastOnlineOpponentAvatarRef.current = null;
        }

        if (state.status === 'waiting') {
          setAiMessage('Soba je otvorena! Pošalji kod ili pozivni link prijatelju.');
        } else if (isRematch) {
          setOnlineModalOpen(false);
          setAiMessage(
            state.chess.currentTurn === yourColor
              ? 'Revanš je počeo! Zamenili ste boje — tvoj potez.'
              : 'Revanš je počeo! Zamenili ste boje — protivnik otvara partiju.'
          );
        } else {
          setOnlineModalOpen(false);
          setAiMessage(
            state.chess.currentTurn === yourColor
              ? 'Online duel je počeo! Igraš kao ' + (yourColor === 'w' ? 'beli' : 'crni') + ' — tvoj potez.'
              : 'Online duel je počeo! Igraš kao ' + (yourColor === 'w' ? 'beli' : 'crni') + ' — čekamo prvi potez protivnika.'
          );
        }
      },
      onMoveApplied: (move, state) => {
        const snap = multiplayerService.getSnapshot();
        const win = window as Window & {
          wizardChess?: {
            applyOnlineMove?: (
              mv: typeof move,
              roomState: typeof state,
              assignedColor: typeof snap.yourColor
            ) => boolean;
          };
        };
        win.wizardChess?.applyOnlineMove?.(move, state, snap.yourColor);
      },
      onMatchEnded: (outcome) => {
        const win = window as Window & {
          wizardChess?: {
            endOnlineMatch?: (endOutcome: typeof outcome) => boolean;
          };
        };
        win.wizardChess?.endOnlineMatch?.(outcome);
        if (outcome.reason === 'resign' || outcome.reason === 'timeout') {
          soundService.playCheck();
        }
      },
    });

    const handleOnlineMoveSubmit = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          fromR: number;
          fromC: number;
          toR: number;
          toC: number;
          promotion?: PromotionPieceType;
        }>
      ).detail;
      if (!detail) return;
      multiplayerService.submitMove(
        detail.fromR,
        detail.fromC,
        detail.toR,
        detail.toC,
        detail.promotion
      );
    };

    const handleOnlineRematchRequest = () => {
      multiplayerService.requestRematch();
    };

    window.addEventListener('wizardchess:online-move-submit', handleOnlineMoveSubmit);
    window.addEventListener('wizardchess:online-rematch-request', handleOnlineRematchRequest);

    const inviteCode = multiplayerService.getInviteCodeFromUrl();
    const stored = multiplayerService.getStoredSession();
    if (inviteCode && (!stored || stored.roomId !== inviteCode)) {
      setOnlineJoinCode(inviteCode);
      setOnlineModalTab('join');
      setOnlineModalOpen(true);
    } else if (stored) {
      multiplayerService.reconnectRoom(stored.roomId, stored.playerToken);
    }

    return () => {
      unsubAuth();
      unsubscribe();
      window.removeEventListener('wizardchess:online-move-submit', handleOnlineMoveSubmit);
      window.removeEventListener('wizardchess:online-rematch-request', handleOnlineRematchRequest);
    };
  }, []);

  useEffect(() => {
    const room = onlineSession.roomState;
    const yourColor = onlineSession.yourColor;
    if (!room || !yourColor) {
      lastOnlineOpponentAvatarRef.current = null;
      return;
    }

    if (room.status === 'playing' && onlineModalOpen) {
      setOnlineModalOpen(false);
    }

    const oppColor = yourColor === 'w' ? 'b' : 'w';
    const oppAvatar = room.players[oppColor]?.avatar || null;
    if (oppAvatar && oppAvatar !== lastOnlineOpponentAvatarRef.current) {
      lastOnlineOpponentAvatarRef.current = oppAvatar;
      setSelectedPersona(oppAvatar);
      selectedPersonaRef.current = oppAvatar;
      applySceneTheme(oppAvatar);
      if (room.chess.moveCount === 0) {
        const oppName = room.players[oppColor]?.displayName || PERSONAS[oppAvatar].name;
        setAiMessage(
          room.chess.currentTurn === yourColor
            ? `Protivnik (${oppName}) se povezao! Tvoj je potez.`
            : `Protivnik (${oppName}) se povezao! Čekamo njegov prvi potez.`
        );
      }
    }
  }, [onlineSession.roomState, onlineSession.yourColor, onlineModalOpen]);

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

  useEffect(() => {
    if (!difficultyMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (difficultyMenuRef.current && !difficultyMenuRef.current.contains(event.target as Node)) {
        setDifficultyMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDifficultyMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [difficultyMenuOpen]);

  useEffect(() => {
    if (isOnlineMode) {
      setDifficultyMenuOpen(false);
    }
  }, [isOnlineMode]);

  const handleSelectAIDifficulty = (nextDifficulty: AIDifficulty) => {
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
    setDifficultyMenuOpen(false);
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
    const win = window as Window & {
      wizardChess?: { setAmbienceMode?: (mode: AmbienceMode) => AmbienceMode };
    };
    win.wizardChess?.setAmbienceMode?.(ambience);
    voiceService.setAmbienceMuted(ambience === 'park');
    try {
      localStorage.setItem('wizard_chess_ambience', ambience);
    } catch (error) {
      console.warn('Ambience preference could not be saved.', error);
    }
  }, [ambience]);

  useEffect(() => {
    try {
      localStorage.setItem('wizard_chess_guided_mode', guidedMode ? '1' : '0');
    } catch (error) {
      console.warn('Guided mode preference could not be saved.', error);
    }
  }, [guidedMode]);

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
    if (isOnlineModeRef.current || academyVisibleRef.current) return;
    setPendingPromotion(null);
    const win = window as unknown as {
      wizardChess?: {
        undoPlayerMove?: () => boolean;
        getFen?: () => string;
        getMoveHistory?: () => { moveCount?: number };
      };
    };
    const success = win.wizardChess?.undoPlayerMove?.();
    if (success) {
      soundService.playUndo();
      const remainingMoves = win.wizardChess?.getMoveHistory?.()?.moveCount ?? 0;
      setHasPlayedMoves(remainingMoves > 0);
      stockfishService.cancelPending();
      const undoFen = win.wizardChess?.getFen?.();
      if (undoFen) {
        const evalSeq = ++evalReqSeqRef.current;
        setIsEvaluating(true);
        void stockfishService
          .evaluatePosition(undoFen, 120)
          .then((evalRes) => {
            if (evalSeq !== evalReqSeqRef.current || !evalRes) return;
            evalBeforeRef.current = evalRes;
            setEvalState(evalRes);
          })
          .finally(() => {
            if (evalSeq === evalReqSeqRef.current) {
              setIsEvaluating(false);
            }
          });
      }

      const reqId = ++aiRequestSeqRef.current;
      if (guidedModeRef.current) {
        void runMoveHint({ isGuided: true, awardXp: false });
        return;
      }
      setIsLoadingAI(true);
      try {
        const reaction = await geminiService.getUndoReaction(selectedPersonaRef.current);
        if (reqId === aiRequestSeqRef.current) {
          setAiVoiceCue('undo');
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
      setHasPlayedMoves(true);
      setPlayerColor(detail.playerColor);
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

      if (detail.gameOver && !isOnlineModeRef.current) {
        const matchResult = isCheckmate ? (isPlayerMove ? 'win' : 'loss') : 'draw';
        const aiPersona = PERSONAS[selectedPersonaRef.current];
        const reason = isCheckmate ? 'checkmate' : detail.drawReason || 'stalemate';
        void authService.recordSinglePlayerMatch({
          playerColor: detail.playerColor,
          opponentName: `${aiPersona.name} (AI)`,
          result: matchResult,
          reason,
          moveCount: detail.moveCount,
        });
      }

      const reqId = ++aiRequestSeqRef.current;
      try {
        let voiceCue: VoiceCue = isCheckmate
          ? 'checkmate'
          : isDraw
            ? 'draw'
            : detail.inCheck
              ? 'check'
              : detail.move?.capture
                ? isPlayerMove
                  ? 'capture'
                  : 'blunder'
                : detail.moveCount <= 4
                  ? 'opening'
                  : 'general';

        const enrichedDetail: MoveEventDetail = { ...detail };

        if (!isOnlineModeRef.current && !academyVisibleRef.current) {
          if (isCheckmate) {
            const mateEval: StockfishEval = {
              whiteCp: detail.currentTurn === 'w' ? -10000 : 10000,
              mateIn: 0,
            };
            evalBeforeRef.current = mateEval;
            setEvalState(mateEval);
            enrichedDetail.evalLabel = evalToDisplay(mateEval).label;
          } else if (isDraw) {
            const drawEval: StockfishEval = { whiteCp: 0, mateIn: null };
            evalBeforeRef.current = drawEval;
            setEvalState(drawEval);
            enrichedDetail.evalLabel = evalToDisplay(drawEval).label;
          } else if (detail.fen) {
            const evalSeq = ++evalReqSeqRef.current;
            setIsEvaluating(true);
            try {
              const nextEval = await stockfishService.evaluatePosition(detail.fen, 120);
              if (nextEval && evalSeq === evalReqSeqRef.current && !isOnlineModeRef.current && !academyVisibleRef.current) {
                const prevEval = evalBeforeRef.current;
                evalBeforeRef.current = nextEval;
                setEvalState(nextEval);
                enrichedDetail.evalLabel = evalToDisplay(nextEval).label;

                if (isPlayerMove) {
                  const { quality, cpLoss } = classifyPlayerMoveQuality(
                    prevEval,
                    nextEval,
                    detail.playerColor
                  );
                  enrichedDetail.moveQuality = quality;
                  enrichedDetail.cpLoss = cpLoss;
                  if (quality === 'blunder' && !detail.inCheck) {
                    voiceCue = 'blunder';
                  }
                }
              }
            } finally {
              if (evalSeq === evalReqSeqRef.current) {
                setIsEvaluating(false);
              }
            }
          }
        }

        if (
          !detail.gameOver &&
          !isOnlineModeRef.current &&
          !academyVisibleRef.current &&
          guidedModeRef.current &&
          detail.currentTurn === detail.playerColor
        ) {
          if (reqId === aiRequestSeqRef.current) {
            void runMoveHint({
              isGuided: true,
              awardXp: false,
              checkAlert: detail.inCheck,
            });
          }
          return;
        }

        const shouldCommentWithAI =
          isOnlineModeRef.current ||
          !isPlayerMove ||
          detail.gameOver ||
          detail.inCheck ||
          enrichedDetail.moveQuality === 'blunder';

        if (!shouldCommentWithAI || reqId !== aiRequestSeqRef.current) {
          if (reqId === aiRequestSeqRef.current) {
            setIsLoadingAI(false);
          }
          return;
        }

        setIsLoadingAI(true);
        const reaction = await geminiService.getReaction(selectedPersonaRef.current, enrichedDetail);
        if (reqId === aiRequestSeqRef.current) {
          setAiVoiceCue(voiceCue);
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

    const handleResetEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ playerColor?: 'w' | 'b' }>).detail;
      setHasPlayedMoves(false);
      aiRequestSeqRef.current += 1;
      guidedReqSeqRef.current += 1;
      evalReqSeqRef.current += 1;
      setIsLoadingAI(false);
      setIsEvaluating(false);
      setPendingPromotion(null);
      evalBeforeRef.current = { whiteCp: 0, mateIn: null };
      if (!isOnlineModeRef.current && !academyVisibleRef.current) {
        stockfishService.newGame();
        setEvalState({ whiteCp: 0, mateIn: null });
      }
      const nextColor = detail?.playerColor === 'b' ? 'b' : 'w';
      if (detail?.playerColor === 'w' || detail?.playerColor === 'b') {
        setPlayerColor(detail.playerColor);
      }
      const p = PERSONAS[selectedPersonaRef.current];
      setAiVoiceCue(undefined);
      setAiMessage(`Nova partija je započeta na oltaru! ${p.name} je spreman za tvoj potez.`);
      if (
        guidedModeRef.current &&
        nextColor === 'w' &&
        !isOnlineModeRef.current &&
        !academyVisibleRef.current
      ) {
        window.setTimeout(() => {
          void runMoveHint({ isGuided: true, awardXp: false });
        }, 80);
      }
    };

    const handleUndoSyncEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ remainingMoves?: number }>).detail;
      setHasPlayedMoves(Boolean(detail?.remainingMoves && detail.remainingMoves > 0));
    };

    const handleOnlineSyncEvent = () => {
      const win = window as Window & {
        wizardChess?: { getMoveHistory?: () => { moveCount?: number } };
      };
      const count = win.wizardChess?.getMoveHistory?.()?.moveCount ?? 0;
      setHasPlayedMoves(count > 0);
    };

    window.addEventListener('wizardchess:move', handleMoveEvent);
    window.addEventListener('wizardchess:reset', handleResetEvent);
    window.addEventListener('wizardchess:undo', handleUndoSyncEvent);
    window.addEventListener('wizardchess:online-sync', handleOnlineSyncEvent);

    return () => {
      window.removeEventListener('wizardchess:move', handleMoveEvent);
      window.removeEventListener('wizardchess:reset', handleResetEvent);
      window.removeEventListener('wizardchess:undo', handleUndoSyncEvent);
      window.removeEventListener('wizardchess:online-sync', handleOnlineSyncEvent);
    };
  }, []);

  useEffect(() => {
    const handleAcademyMove = (e: Event) => {
      const detail = (
        e as CustomEvent<{
          isCheckmate?: boolean;
          gameOver?: boolean;
          inCheck?: boolean;
          move?: { capture?: boolean };
          tutorialStep?: boolean;
        }>
      ).detail;

      if (detail?.isCheckmate) {
        soundService.playCheckmate();
      } else if (detail?.inCheck) {
        soundService.playCheck();
      } else if (detail?.move?.capture) {
        soundService.playCapture();
      } else {
        soundService.playMove();
      }

      if (detail?.tutorialStep) {
        if (tutorialAnimTimerRef.current !== null) {
          window.clearTimeout(tutorialAnimTimerRef.current);
          tutorialAnimTimerRef.current = null;
        }
        setTutorialAnimating(false);
        setTutorialGameOver(Boolean(detail.gameOver));
        const allLessons = [...customLessonsRef.current, ...CHESS_ACADEMY_LESSONS];
        const activeLesson = allLessons.find(
          (item) => item.id === tutorialLessonIdRef.current
        );
        setTutorialStepIndex((prev) => {
          const next = activeLesson ? Math.min(prev + 1, activeLesson.steps.length) : prev + 1;
          if (activeLesson && next >= activeLesson.steps.length) {
            academyProgression.markTutorialCompleted(activeLesson.id);
          }
          return next;
        });
        return;
      }

      setAcademyFeedback(detail?.isCheckmate ? 'solved' : 'wrong');
    };
    window.addEventListener('wizardchess:academy-move', handleAcademyMove);
    return () => {
      window.removeEventListener('wizardchess:academy-move', handleAcademyMove);
      if (tutorialAnimTimerRef.current !== null) {
        window.clearTimeout(tutorialAnimTimerRef.current);
        tutorialAnimTimerRef.current = null;
      }
    };
  }, []);

  const restoreEvalFromEngine = () => {
    const win = window as Window & { wizardChess?: { getFen?: () => string } };
    const restoredFen = win.wizardChess?.getFen?.();
    if (restoredFen && !isOnlineModeRef.current) {
      const evalSeq = ++evalReqSeqRef.current;
      void stockfishService.evaluatePosition(restoredFen, 120).then((evalRes) => {
        if (evalSeq === evalReqSeqRef.current && evalRes) {
          evalBeforeRef.current = evalRes;
          setEvalState(evalRes);
        }
      });
      if (guidedModeRef.current) {
        window.setTimeout(() => {
          void runMoveHint({ isGuided: true, awardXp: false });
        }, 60);
      }
    }
  };

  const handleOpenAcademy = () => {
    if (isOnlineModeRef.current) return;
    setIs2DMode(false);
    setPendingPromotion(null);
    setAcademyView('home');
    setAcademyPuzzleId(null);
    setAcademyFeedback('idle');
    setAcademyHintCount(0);
    setTutorialAnimating(false);
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
    evalReqSeqRef.current += 1;
    stockfishService.cancelPending();
    setIsEvaluating(false);
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

  const handleOpenTutorial = (category?: AcademyCategory) => {
    setTutorialAutoPlay(false);
    const allLessons = [...customLessonsRef.current, ...CHESS_ACADEMY_LESSONS];
    const targetLesson =
      (category ? allLessons.find((item) => item.category === category) : undefined) ||
      allLessons.find((item) => item.id === tutorialLessonIdRef.current) ||
      allLessons[0];
    const win = window as Window & {
      wizardChess?: {
        enterAcademyTutorial?: (
          fen?: string,
          options?: { viewSide?: 'w' | 'b'; immediateCamera?: boolean }
        ) => boolean;
      };
    };
    const viewSide = targetLesson.category === 'Odbrana' ? 'b' : 'w';
    if (!win.wizardChess?.enterAcademyTutorial?.(targetLesson.initialFen, { viewSide })) {
      setAcademyError('3D tutorijal nije mogao da se pokrene na tabli. Pokušaj ponovo.');
      return;
    }
    evalReqSeqRef.current += 1;
    stockfishService.cancelPending();
    setIsEvaluating(false);
    setAcademyView('tutorial');
    setTutorialLessonId(targetLesson.id);
    setTutorialStepIndex(0);
    setTutorialAnimating(false);
    setTutorialGameOver(false);
    setAcademyError(null);
  };

  const handleSelectTutorialLesson = (lessonId: string, customOverride?: ChessAcademyLesson[]) => {
    setTutorialAutoPlay(false);
    const allLessons = [...(customOverride ?? customLessonsRef.current), ...CHESS_ACADEMY_LESSONS];
    const targetLesson = allLessons.find((item) => item.id === lessonId);
    if (!targetLesson) return;
    if (tutorialAnimTimerRef.current !== null) {
      window.clearTimeout(tutorialAnimTimerRef.current);
      tutorialAnimTimerRef.current = null;
    }
    const win = window as Window & {
      wizardChess?: {
        setAcademyFenPosition?: (
          fen?: string,
          options?: { viewSide?: 'w' | 'b'; immediateCamera?: boolean }
        ) => boolean;
      };
    };
    const viewSide = targetLesson.category === 'Odbrana' ? 'b' : 'w';
    if (!win.wizardChess?.setAcademyFenPosition?.(targetLesson.initialFen, { viewSide })) {
      setAcademyError('Lekcija nije mogla da se učita na 3D tablu.');
      return;
    }
    setTutorialLessonId(targetLesson.id);
    setTutorialStepIndex(0);
    setTutorialAnimating(false);
    setTutorialGameOver(false);
    setAcademyError(null);
  };

  const handlePlayTutorialStep = () => {
    if (tutorialAnimating) return;
    const allLessons = [...customLessonsRef.current, ...CHESS_ACADEMY_LESSONS];
    const lesson = allLessons.find((item) => item.id === tutorialLessonIdRef.current);
    const step = lesson?.steps[tutorialStepIndexRef.current];
    if (!lesson || !step) return;
    const win = window as Window & {
      wizardChess?: {
        executeTutorialMove?: (from: string, to: string, promotion?: string) => boolean;
      };
    };
    setAcademyError(null);
    setTutorialAnimating(true);
    const ok = win.wizardChess?.executeTutorialMove?.(step.from, step.to, step.promotion);
    if (!ok) {
      setTutorialAnimating(false);
      setTutorialAutoPlay(false);
      setAcademyError(`Potez ${step.moveNumber} nije mogao da se odigra na tabli.`);
      return;
    }
    if (tutorialAnimTimerRef.current !== null) {
      window.clearTimeout(tutorialAnimTimerRef.current);
    }
    tutorialAnimTimerRef.current = window.setTimeout(() => {
      tutorialAnimTimerRef.current = null;
      setTutorialAnimating(false);
    }, 4500);
  };

  const handlePrevTutorialStep = () => {
    if (tutorialAnimating) return;
    setTutorialAutoPlay(false);
    const prevIndex = tutorialStepIndexRef.current - 1;
    if (prevIndex < 0) return;
    const allLessons = [...customLessonsRef.current, ...CHESS_ACADEMY_LESSONS];
    const lesson = allLessons.find((item) => item.id === tutorialLessonIdRef.current);
    if (!lesson) return;
    const prevFen = reconstructLessonFen(lesson, prevIndex);
    const viewSide: 'w' | 'b' = lesson.category === 'Odbrana' ? 'b' : 'w';
    const win = window as Window & {
      wizardChess?: {
        setAcademyFenPosition?: (
          fen?: string,
          options?: { viewSide?: 'w' | 'b'; immediateCamera?: boolean }
        ) => boolean;
      };
    };
    if (!win.wizardChess?.setAcademyFenPosition?.(prevFen, { viewSide, immediateCamera: true })) {
      setAcademyError('Prethodni potez nije mogao da se prikaže na 3D tabli.');
      return;
    }
    setTutorialStepIndex(prevIndex);
    setTutorialGameOver(false);
    setAcademyError(null);
  };

  const handleToggleTutorialAutoPlay = () => {
    if (academyView !== 'tutorial') return;
    const allLessons = [...customLessonsRef.current, ...CHESS_ACADEMY_LESSONS];
    const lesson = allLessons.find((item) => item.id === tutorialLessonIdRef.current);
    if (!lesson || tutorialStepIndexRef.current >= lesson.steps.length || tutorialGameOver) {
      setTutorialAutoPlay(false);
      return;
    }
    setTutorialAutoPlay((prev) => !prev);
  };

  const handleStartTutorialAutoPlay = () => {
    if (academyView !== 'tutorial') return;
    const allLessons = [...customLessonsRef.current, ...CHESS_ACADEMY_LESSONS];
    const lesson = allLessons.find((item) => item.id === tutorialLessonIdRef.current);
    if (!lesson || tutorialStepIndexRef.current >= lesson.steps.length || tutorialGameOver) {
      return;
    }
    setTutorialAutoPlay(true);
  };

  const handleCacheLessonBrief = (lessonId: string, brief: GameEducationalBrief) => {
    const existing = customLessonsRef.current.find((item) => item.id === lessonId);
    if (!existing) return;
    if (
      existing.gameInfo?.cachedBrief?.source === brief.source &&
      existing.gameInfo?.cachedBrief?.generatedAt === brief.generatedAt
    ) {
      return;
    }
    const updated = customLessonsRef.current.map((item) =>
      item.id === lessonId
        ? {
            ...item,
            gameInfo: {
              ...item.gameInfo,
              cachedBrief: brief,
            },
          }
        : item
    );
    customLessonsRef.current = updated;
    setCustomLessons(updated);
    persistCustomPgnLessons(updated);
  };

  useEffect(() => {
    if (!tutorialAutoPlay) return;
    if (academyView !== 'tutorial' || tutorialGameOver) {
      setTutorialAutoPlay(false);
      return;
    }
    if (tutorialAnimating) return;
    const allLessons = [...customLessonsRef.current, ...CHESS_ACADEMY_LESSONS];
    const lesson = allLessons.find((item) => item.id === tutorialLessonId);
    if (!lesson || tutorialStepIndex >= lesson.steps.length) {
      setTutorialAutoPlay(false);
      return;
    }
    const timer = window.setTimeout(() => {
      handlePlayTutorialStep();
    }, tutorialStepIndex === 0 ? 120 : 450);
    return () => window.clearTimeout(timer);
  }, [
    tutorialAutoPlay,
    academyView,
    tutorialAnimating,
    tutorialGameOver,
    tutorialLessonId,
    tutorialStepIndex,
    customLessons,
  ]);

  const handleResetTutorialLesson = () => {
    setTutorialAutoPlay(false);
    handleSelectTutorialLesson(tutorialLessonIdRef.current);
  };

  const handleImportPgn = (pgnText: string): { ok: boolean; error?: string } => {
    try {
      const newLesson = parsePgnToLesson(pgnText);
      const updated = [newLesson, ...customLessonsRef.current].slice(0, 25);
      customLessonsRef.current = updated;
      setCustomLessons(updated);
      persistCustomPgnLessons(updated);

      if (tutorialAnimTimerRef.current !== null) {
        window.clearTimeout(tutorialAnimTimerRef.current);
        tutorialAnimTimerRef.current = null;
      }

      const win = window as Window & {
        wizardChess?: {
          enterAcademyTutorial?: (
            fen?: string,
            options?: { viewSide?: 'w' | 'b'; immediateCamera?: boolean }
          ) => boolean;
        };
      };
      if (!win.wizardChess?.enterAcademyTutorial?.(newLesson.initialFen, { viewSide: 'w' })) {
        return { ok: false, error: 'Partija je sačuvana, ali 3D tabla nije mogla da je otvori.' };
      }

      evalReqSeqRef.current += 1;
      stockfishService.cancelPending();
      setIsEvaluating(false);
      setTutorialAutoPlay(false);
      setAcademyView('tutorial');
      setTutorialLessonId(newLesson.id);
      setTutorialStepIndex(0);
      setTutorialAnimating(false);
      setTutorialGameOver(false);
      setAcademyError(null);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Neispravan PGN zapis.',
      };
    }
  };

  const handleDeleteCustomLesson = (lessonId: string) => {
    const remaining = customLessonsRef.current.filter((item) => item.id !== lessonId);
    customLessonsRef.current = remaining;
    setCustomLessons(remaining);
    persistCustomPgnLessons(remaining);
    if (tutorialLessonIdRef.current === lessonId) {
      const fallback = remaining[0] || CHESS_ACADEMY_LESSONS[0];
      handleSelectTutorialLesson(fallback.id, remaining);
    }
  };

  const handleTakeOverTutorial = () => {
    const allLessons = [...customLessonsRef.current, ...CHESS_ACADEMY_LESSONS];
    const lesson = allLessons.find((item) => item.id === tutorialLessonIdRef.current);
    const preferredSide: 'w' | 'b' = lesson?.category === 'Odbrana' ? 'b' : 'w';
    if (tutorialAnimTimerRef.current !== null) {
      window.clearTimeout(tutorialAnimTimerRef.current);
      tutorialAnimTimerRef.current = null;
    }
    const win = window as Window & {
      wizardChess?: {
        takeOverAcademyGame?: (preferredPlayerColor?: 'w' | 'b') => boolean;
        getFen?: () => string;
        getCurrentTurn?: () => 'w' | 'b';
      };
    };
    if (!win.wizardChess?.takeOverAcademyGame?.(preferredSide)) {
      setAcademyError('Partija nije mogla da se preuzme iz tutorijala.');
      return;
    }
    setHasPlayedMoves(false);
    setTutorialAutoPlay(false);
    setTutorialAnimating(false);
    setAcademyVisible(false);
    setAcademyView('home');
    setAcademyError(null);
    setPlayerColor(preferredSide);

    stockfishService.newGame();
    const takeoverFen = win.wizardChess?.getFen?.();
    if (takeoverFen) {
      const evalSeq = ++evalReqSeqRef.current;
      setIsEvaluating(true);
      void stockfishService
        .evaluatePosition(takeoverFen, 120)
        .then((evalRes) => {
          if (evalSeq === evalReqSeqRef.current && evalRes) {
            evalBeforeRef.current = evalRes;
            setEvalState(evalRes);
          }
        })
        .finally(() => {
          if (evalSeq === evalReqSeqRef.current) {
            setIsEvaluating(false);
          }
        });
    }

    const turnNow = win.wizardChess?.getCurrentTurn?.() || 'w';
    const personaName = PERSONAS[selectedPersonaRef.current].name;
    setAiVoiceCue('opening');
    setAiMessage(
      turnNow === preferredSide
        ? `Preuzeo si poziciju iz lekcije „${lesson?.name || 'Akademija'}“ (${preferredSide === 'w' ? 'beli' : 'crni'}). Tvoj potez!`
        : `Nastavljaš iz lekcije „${lesson?.name || 'Akademija'}“. ${personaName} povlači odgovor!`
    );
    if (guidedModeRef.current && turnNow === preferredSide) {
      window.setTimeout(() => {
        void runMoveHint({ isGuided: true, awardXp: false });
      }, 80);
    }
  };

  const handleLeaveTutorial = () => {
    if (tutorialAnimTimerRef.current !== null) {
      window.clearTimeout(tutorialAnimTimerRef.current);
      tutorialAnimTimerRef.current = null;
    }
    const win = window as Window & {
      wizardChess?: { exitAcademy?: () => boolean };
    };
    if (!win.wizardChess?.exitAcademy?.()) {
      setAcademyError('Prethodna partija nije mogla automatski da se vrati.');
      return;
    }
    restoreEvalFromEngine();
    setTutorialAutoPlay(false);
    setAcademyView('home');
    setTutorialAnimating(false);
    setTutorialGameOver(false);
    setAcademyError(null);
  };

  const handleCloseAcademy = () => {
    if (tutorialAnimTimerRef.current !== null) {
      window.clearTimeout(tutorialAnimTimerRef.current);
      tutorialAnimTimerRef.current = null;
    }
    if (academyView === 'puzzle' || academyView === 'tutorial') {
      const win = window as Window & {
        wizardChess?: { exitAcademy?: () => boolean };
      };
      if (!win.wizardChess?.exitAcademy?.()) {
        setAcademyError('Partija nije mogla automatski da se vrati. Osveži stranicu samo ako je tabla ostala zaglavljena.');
        return;
      }
      restoreEvalFromEngine();
    }
    setTutorialAutoPlay(false);
    setTutorialAnimating(false);
    setAcademyView('home');
    setAcademyVisible(false);
    setAcademyError(null);
  };

  const handleLeavePuzzle = () => {
    const win = window as Window & {
      wizardChess?: { exitAcademy?: () => boolean };
    };
    if (!win.wizardChess?.exitAcademy?.()) {
      setAcademyError('Partija nije mogla automatski da se vrati. Pokušaj ponovo ili izađi iz Akademije.');
      return;
    }
    restoreEvalFromEngine();
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
        } else if (accountModalOpen) {
          setAccountModalOpen(false);
        } else if (onlineModalOpen) {
          setOnlineModalOpen(false);
        } else if (is2DMode) {
          setIs2DMode(false);
        } else {
          setMobileSheetOpen(false);
        }
      } else if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) {
        if (!academyVisible && !pendingPromotion && !onlineModalOpen && !accountModalOpen && !isOnlineModeRef.current && !isTypingTarget(e.target)) {
          e.preventDefault();
          handleUndoMove();
        }
      } else if (e.key === 'u' || e.key === 'U') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey && !academyVisible && !pendingPromotion && !onlineModalOpen && !accountModalOpen && !isOnlineModeRef.current && !isTypingTarget(e.target)) {
          handleUndoMove();
        }
      } else if (e.key === '2') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey && !academyVisible && !pendingPromotion && !onlineModalOpen && !accountModalOpen && !isTypingTarget(e.target)) {
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
  }, [academyVisible, is2DMode, pendingPromotion, onlineModalOpen, accountModalOpen]);

  const handleOpenOnlineModal = (tab: 'create' | 'join' = 'create') => {
    multiplayerService.clearError();
    setOnlineModalTab(tab);
    setOnlineModalOpen(true);
    setMobileSheetOpen(false);
  };

  const handleCreateOnlineRoom = (
    timeControlId: TimeControlId,
    preferredSide: PreferredSide,
    avatar: OnlinePersonaId
  ) => {
    multiplayerService.createRoom(timeControlId, preferredSide, avatar);
  };

  const handleJoinOnlineRoom = (roomId: string, avatar: OnlinePersonaId) => {
    multiplayerService.joinRoom(roomId, avatar);
  };

  const handleLeaveOnlineRoom = () => {
    multiplayerService.leaveRoom();
    setOnlineModalOpen(false);
    const win = window as Window & {
      wizardChess?: { exitOnlineMode?: () => boolean };
    };
    win.wizardChess?.exitOnlineMode?.();
    evalBeforeRef.current = { whiteCp: 0, mateIn: null };
    setEvalState({ whiteCp: 0, mateIn: null });
    setPlayerColor('w');
    setAiVoiceCue(undefined);
    applySceneTheme(selectedPersonaRef.current);
  };

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

  const runMoveHint = async (options?: {
    isGuided?: boolean;
    awardXp?: boolean;
    checkAlert?: boolean;
  }) => {
    const isGuided = Boolean(options?.isGuided);
    if (isOnlineModeRef.current || academyVisibleRef.current) return;
    if (isGuided && !guidedModeRef.current) return;

    const win = window as unknown as {
      wizardChess?: {
        getBoardState?: () => ({ type: string; color: 'w' | 'b' } | null)[][];
        getFen?: () => string;
        showHintHighlight?: (fromR: number, fromC: number, toR: number, toC: number) => void;
        getFallbackBestMove?: () => {
          fromR: number;
          fromC: number;
          toR: number;
          toC: number;
          fromSquare: string;
          toSquare: string;
          pieceType?: string;
          promotion?: string;
        } | null;
        getGameContext?: () => {
          currentTurn: 'w' | 'b';
          playerColor?: 'w' | 'b';
          gameOver?: boolean;
          inCheck?: boolean;
          fen?: string;
          legalMovesSummary?: string[];
        };
      };
    };

    const ctx = win.wizardChess?.getGameContext?.();
    if (isGuided && (!ctx || ctx.gameOver || ctx.currentTurn !== ctx.playerColor)) {
      return;
    }

    if (options?.awardXp) {
      progressionService.awardHint();
    }

    const reqId = ++aiRequestSeqRef.current;
    const guidedSeq = ++guidedReqSeqRef.current;
    setIsLoadingAI(true);

    try {
      const fen = ctx?.fen || win.wizardChess?.getFen?.() || '';
      let stockfishHint: StockfishHintContext | null = null;

      const hintRes = fen ? await stockfishService.getHintMove(fen, isGuided ? 210 : 240) : null;
      if (
        reqId !== aiRequestSeqRef.current ||
        guidedSeq !== guidedReqSeqRef.current ||
        isOnlineModeRef.current ||
        academyVisibleRef.current
      ) {
        return;
      }
      if (isGuided && !guidedModeRef.current) return;

      const latestCtx = win.wizardChess?.getGameContext?.();
      if (isGuided && (!latestCtx || latestCtx.gameOver || latestCtx.currentTurn !== latestCtx.playerColor)) {
        return;
      }

      if (hintRes) {
        win.wizardChess?.showHintHighlight?.(
          hintRes.move.fromR,
          hintRes.move.fromC,
          hintRes.move.toR,
          hintRes.move.toC
        );
        const boardSnapshot = win.wizardChess?.getBoardState?.();
        const movingPiece = boardSnapshot?.[hintRes.move.fromR]?.[hintRes.move.fromC];
        const evalDisplay = evalToDisplay(hintRes.evalState);
        setEvalState(hintRes.evalState);
        evalBeforeRef.current = hintRes.evalState;
        stockfishHint = {
          fromSquare: hintRes.move.fromSquare,
          toSquare: hintRes.move.toSquare,
          pieceType: movingPiece?.type,
          promotion: hintRes.move.promotion,
          evalLabel: evalDisplay.label,
        };
      } else {
        const fallbackMove = win.wizardChess?.getFallbackBestMove?.();
        if (fallbackMove) {
          win.wizardChess?.showHintHighlight?.(
            fallbackMove.fromR,
            fallbackMove.fromC,
            fallbackMove.toR,
            fallbackMove.toC
          );
          stockfishHint = {
            fromSquare: fallbackMove.fromSquare,
            toSquare: fallbackMove.toSquare,
            pieceType: fallbackMove.pieceType,
            promotion: fallbackMove.promotion,
          };
        }
      }

      const hint = await geminiService.getHint(
        selectedPersonaRef.current,
        latestCtx?.currentTurn || ctx?.currentTurn || 'w',
        latestCtx?.legalMovesSummary || ctx?.legalMovesSummary,
        stockfishHint
      );
      if (
        reqId === aiRequestSeqRef.current &&
        guidedSeq === guidedReqSeqRef.current &&
        !isOnlineModeRef.current &&
        !academyVisibleRef.current &&
        (!isGuided || guidedModeRef.current)
      ) {
        const inCheckNow = options?.checkAlert || latestCtx?.inCheck;
        const cleanHint = isGuided ? hint.replace(/^💡\s*/, '') : hint;
        const formattedMessage = isGuided
          ? `${inCheckNow ? '⚠️ Šah! ' : ''}🧭 Vođeni režim: ${cleanHint}`
          : hint;
        setAiVoiceCue('hint');
        setAiMessage(formattedMessage);
      }
    } catch (err) {
      console.warn('Hint error:', err);
    } finally {
      if (reqId === aiRequestSeqRef.current) {
        setIsLoadingAI(false);
      }
    }
  };

  const handleRequestHint = async () => {
    await runMoveHint({ isGuided: false, awardXp: true });
  };

  const handleToggleGuidedMode = () => {
    if (isOnlineModeRef.current) return;
    const next = !guidedModeRef.current;
    guidedModeRef.current = next;
    setGuidedMode(next);
    setMobileSheetOpen(false);
    if (next) {
      void runMoveHint({ isGuided: true, awardXp: false });
    } else {
      guidedReqSeqRef.current += 1;
      const win = window as Window & { wizardChess?: { clearHintHighlight?: () => void } };
      win.wizardChess?.clearHintHighlight?.();
      setAiVoiceCue(undefined);
      setAiMessage('Vođeni režim je isključen. Igraj samostalno ili zatraži 💡 Savet kada poželiš.');
    }
  };

  const handleExportPgn = () => {
    const win = window as Window & {
      wizardChess?: {
        getMoveHistory?: () => GameExportSnapshot & { moveCount?: number };
      };
    };
    const history = win.wizardChess?.getMoveHistory?.();
    if (!history) return;
    if (history.moves.length === 0 && !history.hasIncompleteHistory && !history.startingFen) {
      return;
    }

    const personaName = PERSONAS[selectedPersonaRef.current].name;
    const playerDisplayName = authSnap.user?.displayName || 'Igrač';
    let whiteName = 'Beli';
    let blackName = 'Crni';
    let eventName = 'Wizard Chess 3D Partija';

    if (isOnlineModeRef.current && onlineSession.roomState) {
      whiteName = onlineSession.roomState.players.w?.displayName || 'Beli';
      blackName = onlineSession.roomState.players.b?.displayName || 'Crni';
      eventName = `Wizard Chess Online Duel (${onlineSession.roomId || 'online'})`;
    } else {
      const aiName = `${personaName} (AI)`;
      if (history.playerColor === 'b') {
        whiteName = aiName;
        blackName = playerDisplayName;
      } else {
        whiteName = playerDisplayName;
        blackName = aiName;
      }
    }

    const pgn = exportMovesToPgn({
      startingFen: history.startingFen,
      currentFen: history.currentFen,
      hasIncompleteHistory: history.hasIncompleteHistory,
      moves: history.moves,
      result: history.result,
      playerColor: history.playerColor,
      whiteName,
      blackName,
      eventName,
    });
    downloadPgnFile(pgn);
    setMobileSheetOpen(false);
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

      {/* Live Stockfish Evaluation Bar in 3D view (hidden in online PvP, Academy, and 2D modal) */}
      {!isOnlineMode && !academyVisible && !is2DMode && (
        <EvalBar
          variant="hud"
          evalState={evalState}
          flipped={playerColor === 'b'}
          isEvaluating={isEvaluating}
        />
      )}

      {/* Floating AI Dialogue Speech Bubble (voice silenced in Central Park Zen mode; text & Hint stay active) */}
      <AIBubble
        personaId={selectedPersona}
        message={aiMessage}
        voiceCue={aiVoiceCue}
        isLoading={isLoadingAI}
        hintDisabled={isOnlineMode}
        zenMode={ambience === 'park'}
        guidedMode={guidedMode}
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

          <button
            type="button"
            id="btn-account"
            className={`hud-btn account-hud-btn ${authSnap.user ? 'logged-in' : ''}`}
            onClick={() => setAccountModalOpen(true)}
            title="Profil igrača, prijava i istorija partija"
          >
            {authSnap.user ? `👤 ${authSnap.user.displayName}` : '👤 Prijava / Gost'}
          </button>

          {/* Desktop AI Persona Selector */}
          {!isOnlineMode && (
            <PersonaSelector
              selectedPersona={selectedPersona}
              onSelectPersona={handleSelectPersona}
            />
          )}
        </div>

        {isOnlineMode && (
          <div className="hud-group" id="hud-online-group">
            <OnlineMatchBar
              session={onlineSession}
              onResign={() => multiplayerService.resign()}
              onOfferDraw={() => multiplayerService.offerDraw()}
              onRespondDraw={(accept) => multiplayerService.respondDraw(accept)}
              onRematch={() => multiplayerService.requestRematch()}
              onLeave={handleLeaveOnlineRoom}
              onShowInviteModal={() => setOnlineModalOpen(true)}
            />
          </div>
        )}
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
        {!isOnlineMode && (
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
        )}

        {/* ── Capsule 1: Režimi ── */}
        <div className="dock-capsule dock-modes">
          <span className="dock-capsule-label">Režimi</span>
          <button
            type="button"
            className="hud-btn academy-launch-button"
            id="btn-academy"
            disabled={isOnlineMode}
            onClick={() => {
              handleOpenAcademy();
              setMobileSheetOpen(false);
            }}
          >
            ✦ Akademija
          </button>
          <button
            type="button"
            className={`hud-btn ${isOnlineMode ? 'active' : ''}`}
            id="btn-online-duel"
            title="Igraj online partiju protiv prijatelja"
            onClick={() => handleOpenOnlineModal('create')}
          >
            ⚔ {isOnlineMode ? `Online (${onlineSession.roomId})` : 'Online'}
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
          <button
            type="button"
            className={`hud-btn ${ambience === 'park' ? 'park-active' : ''}`}
            id="btn-ambience-toggle"
            title={
              ambience === 'park'
                ? 'Prebaci na mračnu katedralu sa 3D protivnikom i glasom'
                : 'Prebaci u Sunčani Central Park (Zen režim bez avatara i govora)'
            }
            onClick={() => {
              setAmbience((prev) => (prev === 'park' ? 'cathedral' : 'park'));
              setMobileSheetOpen(false);
            }}
          >
            {ambience === 'park' ? '🏛️ Katedrala (Duel)' : '🌳 Park (Čista 3D tabla)'}
          </button>
          <button
            type="button"
            className={`hud-btn ${guidedMode ? 'guided-active' : ''} ${isOnlineMode ? 'online-hidden' : ''}`}
            id="btn-guided-mode"
            aria-pressed={guidedMode}
            disabled={isOnlineMode}
            title="Vođeni režim: uvek prikazuje preporuku za tvoj sledeći potez"
            onClick={handleToggleGuidedMode}
          >
            {guidedMode ? '🧭 Vođeni: ON' : '🧭 Vođeni'}
          </button>
        </div>

        {/* ── Capsule 2: Partija (centar) ── */}
        <div className={`dock-capsule dock-game ${isOnlineMode ? 'online-hidden' : ''}`}>
          <span className="dock-capsule-label">Partija</span>
          <button
            className="hud-btn"
            id="btn-undo-move"
            disabled={isOnlineMode}
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
            disabled={isOnlineMode}
            title="Neka AI odigra sledeći potez"
            onClick={() => setMobileSheetOpen(false)}
          >
            ⚡ AI
          </button>
          <button
            className="hud-btn"
            id="btn-reset"
            disabled={isOnlineMode}
            title="Započni novu partiju"
            onClick={() => setMobileSheetOpen(false)}
          >
            🔄 Nova
          </button>
          <button
            type="button"
            className="hud-btn"
            id="btn-export-pgn"
            disabled={!hasPlayedMoves}
            title="Preuzmi odigranu partiju kao PGN fajl"
            onClick={handleExportPgn}
          >
            ⬇ PGN
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
          <div
            ref={difficultyMenuRef}
            className={`difficulty-picker-wrap ${difficultyMenuOpen ? 'open' : ''} ${isOnlineMode ? 'online-hidden' : ''}`}
          >
            <button
              type="button"
              className={`hud-btn ${difficultyMenuOpen ? 'active' : ''}`}
              id="btn-ai-difficulty"
              disabled={isOnlineMode}
              title="Izaberi težinu AI protivnika"
              aria-haspopup="listbox"
              aria-expanded={difficultyMenuOpen}
              aria-label={`Izaberi težinu AI protivnika. Trenutna težina: ${AI_DIFFICULTY_NAMES[aiDifficulty]}`}
              onClick={() => setDifficultyMenuOpen((prev) => !prev)}
            >
              ⚔ {AI_DIFFICULTY_NAMES[aiDifficulty]} ▾
            </button>
            {difficultyMenuOpen && (
              <div
                id="ai-difficulty-menu"
                className="ai-difficulty-popover"
                role="listbox"
                aria-label="Nivo težine AI protivnika"
              >
                <div className="ai-difficulty-popover-header">Nivo težine</div>
                {AI_DIFFICULTY_ORDER.map((level) => {
                  const eloProfile = getStockfishEloProfile(selectedPersona, level);
                  const selected = aiDifficulty === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      id={`btn-ai-difficulty-${level}`}
                      role="option"
                      aria-selected={selected}
                      className={`ai-difficulty-option ${selected ? 'active' : ''}`}
                      onClick={() => handleSelectAIDifficulty(level)}
                    >
                      <span className="ai-difficulty-option-top">
                        <span className="ai-difficulty-option-name">
                          {selected ? '✓ ' : ''}
                          {AI_DIFFICULTY_NAMES[level]}
                        </span>
                        <span className="ai-difficulty-option-elo">{eloProfile.label}</span>
                      </span>
                      <span className="ai-difficulty-option-desc">
                        {AI_DIFFICULTY_DESCRIPTIONS[level]}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <button
            className={`hud-btn ${isOnlineMode ? 'online-hidden' : ''}`}
            id="btn-side-toggle"
            disabled={isOnlineMode}
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
            <button
              type="button"
              className="checkmate-btn"
              id="btn-checkmate-export-pgn"
              onClick={handleExportPgn}
            >
              Preuzmi PGN
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
          tutorialLessonId={tutorialLessonId}
          tutorialStepIndex={tutorialStepIndex}
          tutorialAnimating={tutorialAnimating}
          tutorialGameOver={tutorialGameOver}
          tutorialAutoPlay={tutorialAutoPlay}
          customLessons={customLessons}
          error={academyError}
          onClose={handleCloseAcademy}
          onOpenPuzzle={handleStartPuzzle}
          onNextPuzzle={handleNextPuzzle}
          onLeavePuzzle={handleLeavePuzzle}
          hasNextPuzzle={PUZZLES.findIndex((puzzle) => puzzle.id === academyPuzzleId) < PUZZLES.length - 1}
          onShowHint={() => setAcademyHintCount((count) => Math.min(count + 1, 3))}
          onRetry={handleRetryPuzzle}
          onOpenTutorial={handleOpenTutorial}
          onSelectTutorialLesson={(id) => handleSelectTutorialLesson(id)}
          onPlayTutorialStep={handlePlayTutorialStep}
          onPrevTutorialStep={handlePrevTutorialStep}
          onToggleTutorialAutoPlay={handleToggleTutorialAutoPlay}
          onStartTutorialAutoPlay={handleStartTutorialAutoPlay}
          onResetTutorialLesson={handleResetTutorialLesson}
          onTakeOverTutorial={handleTakeOverTutorial}
          onLeaveTutorial={handleLeaveTutorial}
          onImportPgn={handleImportPgn}
          onDeleteCustomLesson={handleDeleteCustomLesson}
          onCacheLessonBrief={handleCacheLessonBrief}
        />
      ) : null}

      <Classic2DBoard
        isOpen={is2DMode}
        isOnlineMode={isOnlineMode}
        evalState={evalState}
        isEvaluating={isEvaluating}
        hintMessage={aiMessage}
        isLoadingHint={isLoadingAI}
        guidedMode={guidedMode}
        onRequestHint={handleRequestHint}
        onToggleGuidedMode={handleToggleGuidedMode}
        onClose={() => setIs2DMode(false)}
        onUndoMove={handleUndoMove}
        onRequestPromotion={setPendingPromotion}
      />

      <OnlineDuelModal
        isOpen={onlineModalOpen}
        initialTab={onlineModalTab}
        initialJoinCode={onlineJoinCode}
        session={onlineSession}
        onClose={() => setOnlineModalOpen(false)}
        onCreateRoom={handleCreateOnlineRoom}
        onJoinRoom={handleJoinOnlineRoom}
        onCancelWaiting={handleLeaveOnlineRoom}
        onClearError={() => multiplayerService.clearError()}
      />

      <AccountModal
        isOpen={accountModalOpen}
        auth={authSnap}
        onClose={() => setAccountModalOpen(false)}
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
