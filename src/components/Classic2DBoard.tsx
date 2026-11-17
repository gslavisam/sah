import React, { useState, useEffect, useCallback } from 'react';
import { Chess2DPiece, PieceType, PieceColor } from './Chess2DPiece';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUndoMove: () => void;
}

interface PieceData {
  type: PieceType;
  color: PieceColor;
}

interface MoveCoord {
  r: number;
  c: number;
}

interface LastMove {
  fromR: number;
  fromC: number;
  toR: number;
  toC: number;
}

export const Classic2DBoard: React.FC<Props> = ({ isOpen, onClose, onUndoMove }) => {
  const [board, setBoard] = useState<(PieceData | null)[][]>(() =>
    Array.from({ length: 8 }, () => Array(8).fill(null))
  );
  const [selectedSquare, setSelectedSquare] = useState<MoveCoord | null>(null);
  const [validMoves, setValidMoves] = useState<MoveCoord[]>([]);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [currentTurn, setCurrentTurn] = useState<PieceColor>('w');
  const [playerColor, setPlayerColor] = useState<PieceColor>('w');
  const [flipped, setFlipped] = useState(false);
  const [inCheck, setInCheck] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const syncBoardFromEngine = useCallback(() => {
    const win = window as unknown as {
      wizardChess?: {
        getBoardState?: () => (PieceData | null)[][];
        getCurrentTurn?: () => PieceColor;
        getPlayerColor?: () => PieceColor;
        getLastMove?: () => LastMove | null;
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
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    syncBoardFromEngine();

    const handleMove = () => {
      setSelectedSquare(null);
      setValidMoves([]);
      syncBoardFromEngine();
    };

    const handleReset = () => {
      setSelectedSquare(null);
      setValidMoves([]);
      syncBoardFromEngine();
    };

    const handleUndo = () => {
      setSelectedSquare(null);
      setValidMoves([]);
      syncBoardFromEngine();
    };

    window.addEventListener('wizardchess:move', handleMove);
    window.addEventListener('wizardchess:reset', handleReset);
    window.addEventListener('wizardchess:undo', handleUndo);

    return () => {
      window.removeEventListener('wizardchess:move', handleMove);
      window.removeEventListener('wizardchess:reset', handleReset);
      window.removeEventListener('wizardchess:undo', handleUndo);
    };
  }, [isOpen, syncBoardFromEngine]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '2') {
        onClose();
      } else if (e.key.toLowerCase() === 'u' || (e.ctrlKey && e.key.toLowerCase() === 'z')) {
        onUndoMove();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onUndoMove]);

  if (!isOpen) return null;

  const handleSquareClick = (r: number, c: number) => {
    const win = window as unknown as {
      wizardChess?: {
        executeChessMove?: (fromR: number, fromC: number, toR: number, toC: number) => boolean;
        getLegalMovesForPiece?: (r: number, c: number) => MoveCoord[];
      };
    };

    const piece = board[r]?.[c];

    // If already selected, check if clicked on a valid target square
    if (selectedSquare) {
      const isTarget = validMoves.some((m) => m.r === r && m.c === c);
      if (isTarget) {
        win.wizardChess?.executeChessMove?.(selectedSquare.r, selectedSquare.c, r, c);
        setSelectedSquare(null);
        setValidMoves([]);
        return;
      }
    }

    // If clicked on piece of current turn
    if (piece && piece.color === currentTurn) {
      if (selectedSquare && selectedSquare.r === r && selectedSquare.c === c) {
        // Deselect on re-click
        setSelectedSquare(null);
        setValidMoves([]);
      } else {
        setSelectedSquare({ r, c });
        const moves = win.wizardChess?.getLegalMovesForPiece?.(r, c) || [];
        setValidMoves(moves);
      }
      return;
    }

    // Clicked elsewhere
    setSelectedSquare(null);
    setValidMoves([]);
  };

  const isViewFlipped = flipped || playerColor === 'b';
  const rowIndices = isViewFlipped ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const colIndices = isViewFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
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
            {gameOver && <span className="chess-2d-alert-mate">👑 MAT! Partija je završena</span>}
          </div>
          <div className="chess-2d-header-actions">
            <button
              type="button"
              className="chess-2d-btn"
              onClick={() => setFlipped((prev) => !prev)}
              title="Okreni tablu (Flip board)"
            >
              ⮀ Okreni
            </button>
            <button
              type="button"
              className="chess-2d-btn"
              onClick={onUndoMove}
              title="Vrati prethodni potez (U)"
            >
              ⏳ Vrati potez
            </button>
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
                  const isLegalTarget = validMoves.some((m) => m.r === r && m.c === c);
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
                      {isLegalTarget && (
                        <div
                          className={`chess-2d-target-dot ${piece ? 'target-capture' : 'target-empty'}`}
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

