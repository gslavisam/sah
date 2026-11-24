import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Chess2DPiece, PieceType, PieceColor } from './Chess2DPiece';
import { EvalBar } from './EvalBar';
import {
  buildFenFromEditorBoard,
  DEFAULT_START_FEN,
  get2DBoardOrientation,
  parseFenPosition,
  type EditorCastlingRights,
  type StockfishEval,
} from '../shared/chessRules';

export interface PromotionRequest {
  fromR: number;
  fromC: number;
  toR: number;
  toC: number;
  color: PieceColor;
}

interface Props {
  isOpen: boolean;
  isOnlineMode?: boolean;
  isAnalysisMode?: boolean;
  isEditorMode?: boolean;
  isTacticsMode?: boolean;
  tacticsTitle?: string;
  evalState?: StockfishEval | null;
  isEvaluating?: boolean;
  hintMessage?: string;
  isLoadingHint?: boolean;
  guidedMode?: boolean;
  analysisSlot?: React.ReactNode;
  onRequestHint?: () => void;
  onToggleGuidedMode?: () => void;
  onToggleAnalysisMode?: () => void;
  onOpenEditor?: () => void;
  onCancelEditor?: () => void;
  onApplyEditedPosition?: (fen: string) => { ok: boolean; error?: string };
  onClose: () => void;
  onUndoMove: () => void;
  onRequestPromotion: (req: PromotionRequest) => void;
}

interface PieceData {
  type: PieceType;
  color: PieceColor;
}

interface MoveCoord {
  r: number;
  c: number;
  capture?: boolean;
  enPassant?: boolean;
  castle?: 'k' | 'q';
  rookFromC?: number;
  rookToC?: number;
}

interface LastMove {
  fromR: number;
  fromC: number;
  toR: number;
  toC: number;
}

interface HintCoords {
  fromR: number;
  fromC: number;
  toR: number;
  toC: number;
}

type DrawReason = 'stalemate' | 'fifty-move' | 'repetition' | null;

type EditorTool =
  | { kind: 'move' }
  | { kind: 'erase' }
  | { kind: 'place'; type: PieceType; color: PieceColor };

const EDITOR_PIECE_ORDER: { type: PieceType; label: string }[] = [
  { type: 'king', label: 'Kralj' },
  { type: 'queen', label: 'Kraljica' },
  { type: 'rook', label: 'Top' },
  { type: 'bishop', label: 'Lovac' },
  { type: 'knight', label: 'Skakač' },
  { type: 'pawn', label: 'Pešak' },
];

function cloneBoardGrid(grid: (PieceData | null)[][]): (PieceData | null)[][] {
  return Array.from({ length: 8 }, (_, r) =>
    Array.from({ length: 8 }, (__, c) => {
      const cell = grid[r]?.[c];
      return cell ? { type: cell.type, color: cell.color } : null;
    })
  );
}

function createEmptyBoardGrid(): (PieceData | null)[][] {
  return Array.from({ length: 8 }, () => Array(8).fill(null));
}

export const Classic2DBoard: React.FC<Props> = ({
  isOpen,
  isOnlineMode = false,
  isAnalysisMode = false,
  isEditorMode = false,
  isTacticsMode = false,
  tacticsTitle,
  evalState = null,
  isEvaluating = false,
  hintMessage,
  isLoadingHint = false,
  guidedMode = false,
  analysisSlot = null,
  onRequestHint,
  onToggleGuidedMode,
  onToggleAnalysisMode,
  onOpenEditor,
  onCancelEditor,
  onApplyEditedPosition,
  onClose,
  onUndoMove,
  onRequestPromotion,
}) => {
  const [board, setBoard] = useState<(PieceData | null)[][]>(() =>
    createEmptyBoardGrid()
  );
  const [selectedSquare, setSelectedSquare] = useState<{ r: number; c: number } | null>(null);
  const [validMoves, setValidMoves] = useState<MoveCoord[]>([]);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [hintCoords, setHintCoords] = useState<HintCoords | null>(null);
  const [currentTurn, setCurrentTurn] = useState<PieceColor>('w');
  const [playerColor, setPlayerColor] = useState<PieceColor>('w');
  const [flipped, setFlipped] = useState(false);
  const [inCheck, setInCheck] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [drawReason, setDrawReason] = useState<DrawReason>(null);

  const [editorBoard, setEditorBoard] = useState<(PieceData | null)[][]>(() =>
    createEmptyBoardGrid()
  );
  const [editorTurn, setEditorTurn] = useState<PieceColor>('w');
  const [editorCastling, setEditorCastling] = useState<EditorCastlingRights>({
    K: true,
    Q: true,
    k: true,
    q: true,
  });
  const [editorTool, setEditorTool] = useState<EditorTool>({ kind: 'move' });
  const [moveSourceSquare, setMoveSourceSquare] = useState<{ r: number; c: number } | null>(null);
  const [editorApplyError, setEditorApplyError] = useState<string | null>(null);

  const syncBoardFromEngine = useCallback(() => {
    const win = window as unknown as {
      wizardChess?: {
        getBoardState?: () => (PieceData | null)[][];
        getCurrentTurn?: () => PieceColor;
        getPlayerColor?: () => PieceColor;
        getLastMove?: () => LastMove | null;
        getDrawReason?: () => DrawReason;
        getHintHighlight?: () => HintCoords | null;
        isKingInCheck?: (c?: PieceColor) => boolean;
        isGameOver?: () => boolean;
      };
    };
    if (!win.wizardChess?.getBoardState) return;

    const b = win.wizardChess.getBoardState();
    if (b) setBoard(b);

    const turn = win.wizardChess.getCurrentTurn?.() || 'w';
    setCurrentTurn(turn);

    const pCol = win.wizardChess.getPlayerColor?.() || 'w';
    setPlayerColor(pCol);

    const lm = win.wizardChess.getLastMove?.() || null;
    setLastMove(lm);

    const check = win.wizardChess.isKingInCheck?.(turn) || false;
    setInCheck(check);

    const over = win.wizardChess.isGameOver?.() || false;
    setGameOver(over);

    const dr = win.wizardChess.getDrawReason?.() || null;
    setDrawReason(dr);

    const activeHint = win.wizardChess.getHintHighlight?.() || null;
    setHintCoords(activeHint);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    syncBoardFromEngine();

    const handleSync = () => {
      setSelectedSquare(null);
      setValidMoves([]);
      setHintCoords(null);
      syncBoardFromEngine();
    };

    const handleHint = (e: Event) => {
      const detail = (e as CustomEvent<HintCoords | null>).detail;
      setHintCoords(detail || null);
    };

    window.addEventListener('wizardchess:move', handleSync);
    window.addEventListener('wizardchess:academy-move', handleSync);
    window.addEventListener('wizardchess:academy-position', handleSync);
    window.addEventListener('wizardchess:reset', handleSync);
    window.addEventListener('wizardchess:undo', handleSync);
    window.addEventListener('wizardchess:side-changed', handleSync);
    window.addEventListener('wizardchess:analysis-mode', handleSync);
    window.addEventListener('wizardchess:online-sync', handleSync);
    window.addEventListener('wizardchess:hint', handleHint);

    return () => {
      window.removeEventListener('wizardchess:move', handleSync);
      window.removeEventListener('wizardchess:academy-move', handleSync);
      window.removeEventListener('wizardchess:academy-position', handleSync);
      window.removeEventListener('wizardchess:reset', handleSync);
      window.removeEventListener('wizardchess:undo', handleSync);
      window.removeEventListener('wizardchess:side-changed', handleSync);
      window.removeEventListener('wizardchess:analysis-mode', handleSync);
      window.removeEventListener('wizardchess:online-sync', handleSync);
      window.removeEventListener('wizardchess:hint', handleHint);
    };
  }, [isOpen, syncBoardFromEngine]);

  useEffect(() => {
    if (!isOpen || !isEditorMode) return;
    const win = window as unknown as {
      wizardChess?: {
        getBoardState?: () => (PieceData | null)[][];
        getCurrentTurn?: () => PieceColor;
        getFen?: () => string;
      };
    };
    const liveBoard = win.wizardChess?.getBoardState?.();
    const liveTurn = win.wizardChess?.getCurrentTurn?.() || currentTurn;
    const liveFen = win.wizardChess?.getFen?.() || '';
    const castlingPart = liveFen.trim().split(/\s+/)[2] || '';

    setEditorBoard(cloneBoardGrid(liveBoard || board));
    setEditorTurn(liveTurn === 'b' ? 'b' : 'w');
    setEditorCastling({
      K: castlingPart.includes('K'),
      Q: castlingPart.includes('Q'),
      k: castlingPart.includes('k'),
      q: castlingPart.includes('q'),
    });
    setEditorTool({ kind: 'move' });
    setMoveSourceSquare(null);
    setEditorApplyError(null);
  }, [isOpen, isEditorMode]);

  const editorValidation = useMemo(
    () =>
      buildFenFromEditorBoard(editorBoard, {
        turn: editorTurn,
        castling: editorCastling,
      }),
    [editorBoard, editorTurn, editorCastling]
  );

  if (!isOpen) return null;

  const handleNewGame = () => {
    const win = window as unknown as {
      wizardChess?: { resetChessBoard?: (orientCamera?: boolean) => void };
    };
    win.wizardChess?.resetChessBoard?.(true);
  };

  const handleSwitchSide = () => {
    const win = window as unknown as {
      wizardChess?: { toggleSide?: () => boolean };
    };
    setFlipped(false);
    win.wizardChess?.toggleSide?.();
  };

  const handleTriggerAI = () => {
    const win = window as unknown as {
      wizardChess?: { triggerAIMoveNow?: () => boolean };
    };
    win.wizardChess?.triggerAIMoveNow?.();
  };

  const handleEditorSquareClick = (r: number, c: number) => {
    setEditorApplyError(null);
    if (editorTool.kind === 'erase') {
      setMoveSourceSquare(null);
      setEditorBoard((prev) => {
        if (!prev[r]?.[c]) return prev;
        const next = cloneBoardGrid(prev);
        next[r][c] = null;
        return next;
      });
      return;
    }

    if (editorTool.kind === 'place') {
      setMoveSourceSquare(null);
      setEditorBoard((prev) => {
        const next = cloneBoardGrid(prev);
        const existing = next[r][c];
        if (
          existing &&
          existing.type === editorTool.type &&
          existing.color === editorTool.color
        ) {
          next[r][c] = null;
        } else {
          next[r][c] = { type: editorTool.type, color: editorTool.color };
        }
        return next;
      });
      return;
    }

    if (moveSourceSquare) {
      if (moveSourceSquare.r === r && moveSourceSquare.c === c) {
        setMoveSourceSquare(null);
        return;
      }
      setEditorBoard((prev) => {
        const srcPiece = prev[moveSourceSquare.r]?.[moveSourceSquare.c];
        if (!srcPiece) return prev;
        const next = cloneBoardGrid(prev);
        next[r][c] = { type: srcPiece.type, color: srcPiece.color };
        next[moveSourceSquare.r][moveSourceSquare.c] = null;
        return next;
      });
      setMoveSourceSquare(null);
      return;
    }

    if (editorBoard[r]?.[c]) {
      setMoveSourceSquare({ r, c });
    }
  };

  const handleEditorSquareContextMenu = (e: React.MouseEvent, r: number, c: number) => {
    if (!isEditorMode) return;
    e.preventDefault();
    setEditorApplyError(null);
    setMoveSourceSquare((prev) => (prev && prev.r === r && prev.c === c ? null : prev));
    setEditorBoard((prev) => {
      if (!prev[r]?.[c]) return prev;
      const next = cloneBoardGrid(prev);
      next[r][c] = null;
      return next;
    });
  };

  const handleEditorResetStart = () => {
    const parsed = parseFenPosition(DEFAULT_START_FEN);
    if (parsed) {
      setEditorBoard(cloneBoardGrid(parsed.board));
    }
    setEditorTurn('w');
    setEditorCastling({ K: true, Q: true, k: true, q: true });
    setMoveSourceSquare(null);
    setEditorApplyError(null);
  };

  const handleEditorKingsOnly = () => {
    const next = createEmptyBoardGrid();
    next[7][4] = { type: 'king', color: 'w' };
    next[0][4] = { type: 'king', color: 'b' };
    setEditorBoard(next);
    setEditorTurn('w');
    setEditorCastling({ K: false, Q: false, k: false, q: false });
    setMoveSourceSquare(null);
    setEditorApplyError(null);
  };

  const handleEditorClearBoard = () => {
    setEditorBoard(createEmptyBoardGrid());
    setEditorCastling({ K: false, Q: false, k: false, q: false });
    setMoveSourceSquare(null);
    setEditorApplyError(null);
  };

  const handleApplyEditor = () => {
    if (!editorValidation.ok || !editorValidation.fen || !onApplyEditedPosition) return;
    const res = onApplyEditedPosition(editorValidation.fen);
    if (!res.ok) {
      setEditorApplyError(res.error || 'Pozicija nije mogla da se primeni.');
    }
  };

  const handleSquareClick = (r: number, c: number) => {
    if (isEditorMode) {
      handleEditorSquareClick(r, c);
      return;
    }
    if (!isAnalysisMode) {
      if (gameOver || currentTurn !== playerColor) return;
    } else if (gameOver) {
      return;
    }

    const win = window as unknown as {
      wizardChess?: {
        executeChessMove?: (
          fromR: number,
          fromC: number,
          toR: number,
          toC: number,
          options?: { instant?: boolean; promotion?: PieceType }
        ) => boolean;
        getLegalMovesForPiece?: (r: number, c: number) => MoveCoord[];
      };
    };

    const piece = board[r]?.[c];

    // If already selected, check if clicked on a valid target square (or castling rook)
    if (selectedSquare) {
      const targetMove = validMoves.find(
        (m) => (m.r === r && m.c === c) || (m.castle && m.r === r && m.rookFromC === c)
      );
      if (targetMove) {
        const movingPiece = board[selectedSquare.r]?.[selectedSquare.c];
        if (movingPiece?.type === 'pawn' && (targetMove.r === 0 || targetMove.r === 7)) {
          onRequestPromotion({
            fromR: selectedSquare.r,
            fromC: selectedSquare.c,
            toR: targetMove.r,
            toC: targetMove.c,
            color: movingPiece.color,
          });
          setSelectedSquare(null);
          setValidMoves([]);
          return;
        }
        win.wizardChess?.executeChessMove?.(
          selectedSquare.r,
          selectedSquare.c,
          targetMove.r,
          targetMove.c,
          { instant: true }
        );
        setSelectedSquare(null);
        setValidMoves([]);
        return;
      }
    }

    // If clicked on piece of player's turn
    if (piece && piece.color === currentTurn) {
      if (selectedSquare && selectedSquare.r === r && selectedSquare.c === c) {
        setSelectedSquare(null);
        setValidMoves([]);
      } else {
        setSelectedSquare({ r, c });
        const moves = win.wizardChess?.getLegalMovesForPiece?.(r, c) || [];
        setValidMoves(moves);
      }
      return;
    }

    setSelectedSquare(null);
    setValidMoves([]);
  };

  const isCheckmate = gameOver && inCheck && !drawReason;
  const isDraw = gameOver && !isCheckmate;
  const drawLabel =
    drawReason === 'repetition'
      ? '🤝 REMI! Trostruko ponavljanje'
      : drawReason === 'fifty-move'
        ? '🤝 REMI! Pravilo 50 poteza'
        : '🤝 PAT! Partija je završena remijem';

  const { isViewFlipped, rowIndices, colIndices } = get2DBoardOrientation(playerColor, flipped);
  const fileLetters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const displayedBoard = isEditorMode ? editorBoard : board;
  const displayedTurn = isEditorMode ? editorTurn : currentTurn;

  const canCastleWK =
    editorBoard[7]?.[4]?.type === 'king' &&
    editorBoard[7]?.[4]?.color === 'w' &&
    editorBoard[7]?.[7]?.type === 'rook' &&
    editorBoard[7]?.[7]?.color === 'w';
  const canCastleWQ =
    editorBoard[7]?.[4]?.type === 'king' &&
    editorBoard[7]?.[4]?.color === 'w' &&
    editorBoard[7]?.[0]?.type === 'rook' &&
    editorBoard[7]?.[0]?.color === 'w';
  const canCastleBK =
    editorBoard[0]?.[4]?.type === 'king' &&
    editorBoard[0]?.[4]?.color === 'b' &&
    editorBoard[0]?.[7]?.type === 'rook' &&
    editorBoard[0]?.[7]?.color === 'b';
  const canCastleBQ =
    editorBoard[0]?.[4]?.type === 'king' &&
    editorBoard[0]?.[4]?.color === 'b' &&
    editorBoard[0]?.[0]?.type === 'rook' &&
    editorBoard[0]?.[0]?.color === 'b';

  return (
    <div className="chess-2d-backdrop" role="dialog" aria-modal="true" aria-label="Klasični 2D Šah">
      <div className="chess-2d-container">
        {/* Top bar */}
        <div className="chess-2d-header">
          <div className="chess-2d-title-group">
            <span className="chess-2d-badge">
              {isEditorMode ? 'EDITOR TABLE' : isTacticsMode ? '⚡ TAKTIČKA ARENA' : '2D KLASIK'}
            </span>
            <h2 className="chess-2d-title">
              {isEditorMode ? 'Postavi poziciju' : isTacticsMode ? (tacticsTitle || 'Taktički izazov') : 'Šahovska tabla'}
            </h2>
          </div>
          <div className="chess-2d-status-bar">
            <span className={`chess-2d-turn-pill ${displayedTurn === 'w' ? 'turn-white' : 'turn-black'}`}>
              <span className="turn-dot"></span>
              {displayedTurn === 'w' ? 'Beli na potezu' : 'Crni na potezu'}
            </span>
            {!isEditorMode && inCheck && !gameOver && (
              <span className="chess-2d-alert-check">⚠️ ŠAH!</span>
            )}
            {!isEditorMode && isCheckmate && (
              <span className="chess-2d-alert-mate">
                👑 ŠAH-MAT! Pobednik: {currentTurn === 'w' ? 'Crni' : 'Beli'}
              </span>
            )}
            {!isEditorMode && isDraw && <span className="chess-2d-alert-draw">{drawLabel}</span>}
          </div>
          <div className="chess-2d-header-actions">
            {!isOnlineMode && !isEditorMode && !isTacticsMode && (
              <>
                <button
                  type="button"
                  className="chess-2d-btn"
                  onClick={handleNewGame}
                  title="Započni novu partiju"
                >
                  🔄 Nova
                </button>
                <button
                  type="button"
                  className="chess-2d-btn"
                  onClick={handleSwitchSide}
                  title="Promeni stranu (Beli / Crni)"
                >
                  ⮂ {playerColor === 'w' ? 'Crni' : 'Beli'}
                </button>
                <button
                  type="button"
                  className="chess-2d-btn"
                  onClick={handleTriggerAI}
                  disabled={gameOver}
                  title="Neka AI odigra potez"
                >
                  ⚡ AI
                </button>
                {onToggleAnalysisMode && (
                  <button
                    type="button"
                    id="btn-2d-analysis"
                    className={`chess-2d-btn chess-2d-btn-analysis ${isAnalysisMode ? 'active' : ''}`}
                    aria-pressed={isAnalysisMode}
                    onClick={onToggleAnalysisMode}
                    title="Režim Analize: igraj poteze za obe strane, učitaj FEN ili sliku"
                  >
                    {isAnalysisMode ? '🔬 Analiza ON' : '🔬 Analiza'}
                  </button>
                )}
                {onOpenEditor && (
                  <button
                    type="button"
                    id="btn-2d-edit-board"
                    className="chess-2d-btn chess-2d-btn-editor"
                    onClick={onOpenEditor}
                    title="Ručno postavi figure na tablu i dobij predlog poteza"
                  >
                    ✎ Uredi
                  </button>
                )}
                {onToggleGuidedMode && (
                  <button
                    type="button"
                    id="btn-2d-guided"
                    className={`chess-2d-btn chess-2d-btn-guided ${guidedMode ? 'active' : ''}`}
                    aria-pressed={guidedMode}
                    onClick={onToggleGuidedMode}
                    title={
                      guidedMode
                        ? 'Vođeni režim je uključen (automatska preporuka za tvoj potez)'
                        : 'Uključi Vođeni režim (stalna automatska preporuka poteza)'
                    }
                  >
                    {guidedMode ? '🧭 Vođeni ON' : '🧭 Vođeni'}
                  </button>
                )}
                {onRequestHint && (
                  <button
                    type="button"
                    className="chess-2d-btn chess-2d-btn-hint"
                    onClick={onRequestHint}
                    disabled={gameOver || isLoadingHint}
                    title="Zatraži Stockfish savet za sledeći potez"
                  >
                    {isLoadingHint ? '⏳...' : '💡 Savet'}
                  </button>
                )}
              </>
            )}
            <button
              type="button"
              className="chess-2d-btn"
              onClick={() => setFlipped((prev) => !prev)}
              aria-pressed={flipped}
              title="Okreni tablu"
            >
              ⮀ Okreni
            </button>
            {!isOnlineMode && !isEditorMode && !isTacticsMode && (
              <button
                type="button"
                className="chess-2d-btn"
                onClick={onUndoMove}
                title="Vrati prethodni potez (U)"
              >
                ⏳ Vrati
              </button>
            )}
            <button
              type="button"
              className="chess-2d-btn chess-2d-btn-close"
              onClick={isEditorMode && onCancelEditor ? onCancelEditor : onClose}
              title={isEditorMode ? 'Otkaži uređivanje table' : 'Vrati se u 3D prikaz (Esc ili 2)'}
            >
              {isEditorMode ? '✕ Otkaži editor' : '🏰 3D'}
            </button>
          </div>
        </div>

        {isEditorMode && !isOnlineMode ? (
          <div className="chess-2d-editor-panel" id="board-editor-panel">
            <div className="chess-2d-editor-tools-row">
              <button
                type="button"
                id="btn-editor-tool-move"
                className={`chess-2d-editor-tool-btn ${editorTool.kind === 'move' ? 'active' : ''}`}
                aria-pressed={editorTool.kind === 'move'}
                onClick={() => {
                  setEditorTool({ kind: 'move' });
                  setMoveSourceSquare(null);
                }}
                title="Pomeri postojeću figuru na bilo koje polje"
              >
                ✋ Pomeri
              </button>
              <button
                type="button"
                id="btn-editor-tool-erase"
                className={`chess-2d-editor-tool-btn ${editorTool.kind === 'erase' ? 'active' : ''}`}
                aria-pressed={editorTool.kind === 'erase'}
                onClick={() => {
                  setEditorTool({ kind: 'erase' });
                  setMoveSourceSquare(null);
                }}
                title="Klikni na polje da obrišeš figuru (ili koristi desni klik)"
              >
                🗑 Obriši
              </button>
              <button
                type="button"
                id="btn-editor-preset-start"
                className="chess-2d-editor-tool-btn"
                onClick={handleEditorResetStart}
                title="Postavi početni raspored svih figura"
              >
                ↺ Početna
              </button>
              <button
                type="button"
                id="btn-editor-preset-kings"
                className="chess-2d-editor-tool-btn"
                onClick={handleEditorKingsOnly}
                title="Ostavi samo belog i crnog kralja radi brzog slaganja završnice"
              >
                🧹 Samo kraljevi
              </button>
              <button
                type="button"
                id="btn-editor-preset-clear"
                className="chess-2d-editor-tool-btn"
                onClick={handleEditorClearBoard}
                title="Isprazni sva 64 polja"
              >
                ✕ Prazna
              </button>
            </div>

            <div className="chess-2d-editor-palettes">
              {(['w', 'b'] as const).map((color) => (
                <div key={color} className="chess-2d-editor-palette-group">
                  <span className="chess-2d-editor-palette-label">
                    {color === 'w' ? 'Beli:' : 'Crni:'}
                  </span>
                  <div className="chess-2d-editor-palette-btns">
                    {EDITOR_PIECE_ORDER.map((item) => {
                      const isActive =
                        editorTool.kind === 'place' &&
                        editorTool.color === color &&
                        editorTool.type === item.type;
                      return (
                        <button
                          key={`${color}-${item.type}`}
                          type="button"
                          className={`chess-2d-editor-piece-btn ${isActive ? 'active' : ''}`}
                          aria-pressed={isActive}
                          onClick={() => {
                            setEditorTool({ kind: 'place', type: item.type, color });
                            setMoveSourceSquare(null);
                          }}
                          title={`${color === 'w' ? 'Beli' : 'Crni'} ${item.label}`}
                        >
                          <Chess2DPiece type={item.type} color={color} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="chess-2d-editor-meta-row">
              <div className="chess-2d-editor-turn-group" role="group" aria-label="Ko je na potezu">
                <button
                  type="button"
                  id="btn-editor-turn-w"
                  className={`chess-2d-editor-turn-btn ${editorTurn === 'w' ? 'active' : ''}`}
                  aria-pressed={editorTurn === 'w'}
                  onClick={() => setEditorTurn('w')}
                >
                  ♔ Beli na potezu
                </button>
                <button
                  type="button"
                  id="btn-editor-turn-b"
                  className={`chess-2d-editor-turn-btn ${editorTurn === 'b' ? 'active' : ''}`}
                  aria-pressed={editorTurn === 'b'}
                  onClick={() => setEditorTurn('b')}
                >
                  ♚ Crni na potezu
                </button>
              </div>

              <div className="chess-2d-editor-castling" aria-label="Prava rokade">
                <span className="chess-2d-editor-castling-label">Rokada:</span>
                <label className={!canCastleWK ? 'disabled' : ''}>
                  <input
                    type="checkbox"
                    checked={canCastleWK && editorCastling.K}
                    disabled={!canCastleWK}
                    onChange={(e) =>
                      setEditorCastling((prev) => ({ ...prev, K: e.target.checked }))
                    }
                  />
                  0-0 (B)
                </label>
                <label className={!canCastleWQ ? 'disabled' : ''}>
                  <input
                    type="checkbox"
                    checked={canCastleWQ && editorCastling.Q}
                    disabled={!canCastleWQ}
                    onChange={(e) =>
                      setEditorCastling((prev) => ({ ...prev, Q: e.target.checked }))
                    }
                  />
                  0-0-0 (B)
                </label>
                <label className={!canCastleBK ? 'disabled' : ''}>
                  <input
                    type="checkbox"
                    checked={canCastleBK && editorCastling.k}
                    disabled={!canCastleBK}
                    onChange={(e) =>
                      setEditorCastling((prev) => ({ ...prev, k: e.target.checked }))
                    }
                  />
                  0-0 (C)
                </label>
                <label className={!canCastleBQ ? 'disabled' : ''}>
                  <input
                    type="checkbox"
                    checked={canCastleBQ && editorCastling.q}
                    disabled={!canCastleBQ}
                    onChange={(e) =>
                      setEditorCastling((prev) => ({ ...prev, q: e.target.checked }))
                    }
                  />
                  0-0-0 (C)
                </label>
              </div>
            </div>

            <div className="chess-2d-editor-footer-row">
              <div
                className={`chess-2d-editor-validation ${
                  editorApplyError || !editorValidation.ok ? 'err' : 'ok'
                }`}
                role="status"
              >
                {editorApplyError
                  ? `⚠️ ${editorApplyError}`
                  : editorValidation.ok
                    ? '✓ Pozicija je ispravna. Klikni Primeni za trenutni predlog najboljeg poteza.'
                    : `⚠️ ${editorValidation.error}`}
              </div>
              <div className="chess-2d-editor-actions">
                {onCancelEditor && (
                  <button
                    type="button"
                    id="btn-editor-cancel"
                    className="chess-2d-btn"
                    onClick={onCancelEditor}
                  >
                    Otkaži
                  </button>
                )}
                <button
                  type="button"
                  id="btn-editor-apply"
                  className="chess-2d-editor-apply-btn"
                  disabled={!editorValidation.ok}
                  onClick={handleApplyEditor}
                >
                  ✓ Primeni i predloži potez
                </button>
              </div>
            </div>
          </div>
        ) : (
          isAnalysisMode && !isOnlineMode && analysisSlot
        )}

        {/* Board wrapper with EvalBar + ranks & files coordinates */}
        <div className="chess-2d-board-wrapper">
          {!isOnlineMode && !isEditorMode && !isTacticsMode && (
            <EvalBar
              evalState={evalState}
              flipped={isViewFlipped}
              isEvaluating={isEvaluating}
              variant="board2d"
            />
          )}
          <div className={`chess-2d-board ${isEditorMode ? 'editor-active' : ''}`}>
            {rowIndices.map((r) => (
              <div key={r} className="chess-2d-row">
                {colIndices.map((c) => {
                  const piece = displayedBoard[r]?.[c];
                  const isLight = (r + c) % 2 === 0;
                  const isSelected = isEditorMode
                    ? moveSourceSquare?.r === r && moveSourceSquare?.c === c
                    : selectedSquare?.r === r && selectedSquare?.c === c;
                  const legalTarget = !isEditorMode
                    ? validMoves.find((m) => m.r === r && m.c === c)
                    : undefined;
                  const isLastMoveSquare =
                    !isEditorMode &&
                    lastMove &&
                    ((lastMove.fromR === r && lastMove.fromC === c) ||
                      (lastMove.toR === r && lastMove.toC === c));
                  const isHintFrom = !isEditorMode && hintCoords?.fromR === r && hintCoords?.fromC === c;
                  const isHintTo = !isEditorMode && hintCoords?.toR === r && hintCoords?.toC === c;
                  const isKingCheck =
                    !isEditorMode &&
                    inCheck &&
                    piece?.type === 'king' &&
                    piece?.color === currentTurn;

                  return (
                    <div
                      key={c}
                      className={`chess-2d-square ${isLight ? 'square-light' : 'square-dark'} ${
                        isSelected ? 'square-selected' : ''
                      } ${isLastMoveSquare ? 'square-lastmove' : ''} ${
                        isHintFrom ? 'square-hint-from' : ''
                      } ${isHintTo ? 'square-hint-to' : ''} ${
                        isKingCheck ? 'square-in-check' : ''
                      }`}
                      onClick={() => handleSquareClick(r, c)}
                      onContextMenu={(e) => handleEditorSquareContextMenu(e, r, c)}
                    >
                      {/* Rank coordinate on the leftmost square of each row */}
                      {c === colIndices[0] && (
                        <span className="chess-2d-coord-rank">{8 - r}</span>
                      )}

                      {/* File coordinate on the bottom-most square of each column */}
                      {r === rowIndices[rowIndices.length - 1] && (
                        <span className="chess-2d-coord-file">{fileLetters[c]}</span>
                      )}

                      {/* Piece SVG */}
                      {piece && <Chess2DPiece type={piece.type} color={piece.color} />}

                      {/* Legal target indicators */}
                      {legalTarget && (
                        <div
                          className={`chess-2d-target-dot ${
                            legalTarget.capture || piece ? 'target-capture' : 'target-empty'
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom hint bar */}
        <div className="chess-2d-footer">
          {isEditorMode ? (
            <span>
              ✎ <strong>Editor table:</strong> Izaberi figuru iz palete pa klikni na polje (isti klik briše), koristi <strong>✋ Pomeri</strong> za premeštanje ili <strong>desni klik</strong> za brisanje.
            </span>
          ) : isTacticsMode ? (
            <span>
              ⚡ <strong>Taktička arena (2D):</strong> Odigraj najbolji potez na 2D tabli. Koristi levi panel za nagoveštaj, režime ili povratak u <strong>3D</strong>.
            </span>
          ) : !isOnlineMode && hintCoords && hintMessage ? (
            <span className="chess-2d-active-hint">{hintMessage}</span>
          ) : !isOnlineMode && guidedMode && isLoadingHint && !gameOver ? (
            <span className="chess-2d-active-hint">🧭 Vođeni režim traži najbolji potez...</span>
          ) : (
            <span>
              💡 <strong>Savet:</strong> Klikni na figuru da vidiš legalna polja. Prečica <strong>U</strong> vraća potez, a <strong>Esc</strong> ili dugme <strong>3D</strong> vraća te u 3D prikaz.
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

