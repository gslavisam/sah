import React, { useState, useEffect, useCallback } from 'react';
import { Chess2DPiece, PieceType, PieceColor } from './Chess2DPiece';
import { get2DBoardOrientation } from '../shared/chessRules';

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

type DrawReason = 'stalemate' | 'fifty-move' | 'repetition' | null;

export const Classic2DBoard: React.FC<Props> = ({
  isOpen,
  isOnlineMode = false,
  onClose,
  onUndoMove,
  onRequestPromotion,
}) => {
  const [board, setBoard] = useState<(PieceData | null)[][]>(() =>
    Array.from({ length: 8 }, () => Array(8).fill(null))
  );
  const [selectedSquare, setSelectedSquare] = useState<{ r: number; c: number } | null>(null);
  const [validMoves, setValidMoves] = useState<MoveCoord[]>([]);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [currentTurn, setCurrentTurn] = useState<PieceColor>('w');
  const [playerColor, setPlayerColor] = useState<PieceColor>('w');
  const [flipped, setFlipped] = useState(false);
  const [inCheck, setInCheck] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [drawReason, setDrawReason] = useState<DrawReason>(null);

  const syncBoardFromEngine = useCallback(() => {
    const win = window as unknown as {
      wizardChess?: {
        getBoardState?: () => (PieceData | null)[][];
        getCurrentTurn?: () => PieceColor;
        getPlayerColor?: () => PieceColor;
        getLastMove?: () => LastMove | null;
        getDrawReason?: () => DrawReason;
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
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    syncBoardFromEngine();

    const handleSync = () => {
      setSelectedSquare(null);
      setValidMoves([]);
      syncBoardFromEngine();
    };

    window.addEventListener('wizardchess:move', handleSync);
    window.addEventListener('wizardchess:reset', handleSync);
    window.addEventListener('wizardchess:undo', handleSync);
    window.addEventListener('wizardchess:online-sync', handleSync);

    return () => {
      window.removeEventListener('wizardchess:move', handleSync);
      window.removeEventListener('wizardchess:reset', handleSync);
      window.removeEventListener('wizardchess:undo', handleSync);
      window.removeEventListener('wizardchess:online-sync', handleSync);
    };
  }, [isOpen, syncBoardFromEngine]);

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

  const handleSquareClick = (r: number, c: number) => {
    if (gameOver || currentTurn !== playerColor) return;

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

  const { rowIndices, colIndices } = get2DBoardOrientation(playerColor, flipped);
  const fileLetters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  return (
    <div className="chess-2d-backdrop" role="dialog" aria-modal="true" aria-label="Klasični 2D Šah">
      <div className="chess-2d-container">
        {/* Top bar */}
        <div className="chess-2d-header">
          <div className="chess-2d-title-group">
            <span className="chess-2d-badge">2D KLASIK</span>
            <h2 className="chess-2d-title">Šahovska tabla</h2>
          </div>
          <div className="chess-2d-status-bar">
            <span className={`chess-2d-turn-pill ${currentTurn === 'w' ? 'turn-white' : 'turn-black'}`}>
              <span className="turn-dot"></span>
              {currentTurn === 'w' ? 'Beli na potezu' : 'Crni na potezu'}
            </span>
            {inCheck && !gameOver && <span className="chess-2d-alert-check">⚠️ ŠAH!</span>}
            {isCheckmate && (
              <span className="chess-2d-alert-mate">
                👑 ŠAH-MAT! Pobednik: {currentTurn === 'w' ? 'Crni' : 'Beli'}
              </span>
            )}
            {isDraw && <span className="chess-2d-alert-draw">{drawLabel}</span>}
          </div>
          <div className="chess-2d-header-actions">
            {!isOnlineMode && (
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
            {!isOnlineMode && (
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
              onClick={onClose}
              title="Vrati se u 3D katedralu (Esc ili 2)"
            >
              🏰 3D Katedrala ✕
            </button>
          </div>
        </div>

        {/* Board wrapper with ranks & files coordinates */}
        <div className="chess-2d-board-wrapper">
          <div className="chess-2d-board">
            {rowIndices.map((r) => (
              <div key={r} className="chess-2d-row">
                {colIndices.map((c) => {
                  const piece = board[r]?.[c];
                  const isLight = (r + c) % 2 === 0;
                  const isSelected = selectedSquare?.r === r && selectedSquare?.c === c;
                  const legalTarget = validMoves.find((m) => m.r === r && m.c === c);
                  const isLastMoveSquare =
                    lastMove &&
                    ((lastMove.fromR === r && lastMove.fromC === c) ||
                      (lastMove.toR === r && lastMove.toC === c));
                  const isKingCheck =
                    inCheck && piece?.type === 'king' && piece?.color === currentTurn;

                  return (
                    <div
                      key={c}
                      className={`chess-2d-square ${isLight ? 'square-light' : 'square-dark'} ${
                        isSelected ? 'square-selected' : ''
                      } ${isLastMoveSquare ? 'square-lastmove' : ''} ${
                        isKingCheck ? 'square-in-check' : ''
                      }`}
                      onClick={() => handleSquareClick(r, c)}
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
          <span>
            💡 <strong>Savet:</strong> Klikni na figuru da vidiš legalna polja. Prečica <strong>U</strong> vraća potez, a <strong>Esc</strong> ili dugme gore vraća te u 3D katedralu.
          </span>
        </div>
      </div>
    </div>
  );
};

