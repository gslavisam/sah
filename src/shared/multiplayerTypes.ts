import type {
  AppliedMove,
  BoardPiece,
  DrawReason,
  EnPassantTarget,
  PieceColor,
  PromotionPieceType,
} from './chessRules.ts';

export type OnlinePersonaId = 'mentor' | 'roast' | 'rival';
export type TimeControlId = '3+2' | '5+0' | '10+0' | '15+10';
export type PreferredSide = 'w' | 'b' | 'random';
export type RoomStatus = 'waiting' | 'playing' | 'ended';
export type MatchOutcomeReason =
  | 'checkmate'
  | 'stalemate'
  | 'repetition'
  | 'fifty-move'
  | 'resign'
  | 'timeout'
  | 'draw_agreed'
  | null;

export interface TimeControlPreset {
  id: TimeControlId;
  label: string;
  baseMs: number;
  incrementMs: number;
}

export const TIME_CONTROLS: Record<TimeControlId, TimeControlPreset> = {
  '3+2': { id: '3+2', label: '3 min + 2s', baseMs: 180_000, incrementMs: 2_000 },
  '5+0': { id: '5+0', label: '5 min', baseMs: 300_000, incrementMs: 0 },
  '10+0': { id: '10+0', label: '10 min', baseMs: 600_000, incrementMs: 0 },
  '15+10': { id: '15+10', label: '15 min + 10s', baseMs: 900_000, incrementMs: 10_000 },
};

export interface PublicPlayerInfo {
  connected: boolean;
  avatar: OnlinePersonaId;
  rematchRequested: boolean;
  displayName: string;
  levelTitle: string;
}

export interface PublicRoomState {
  roomId: string;
  status: RoomStatus;
  timeControl: TimeControlPreset;
  players: {
    w: PublicPlayerInfo | null;
    b: PublicPlayerInfo | null;
  };
  chess: {
    board: (BoardPiece | null)[][];
    currentTurn: PieceColor;
    enPassantTarget: EnPassantTarget | null;
    halfMoveClock: number;
    positionHistory: string[];
    moveCount: number;
    inCheck: boolean;
    isCheckmate: boolean;
    drawReason: DrawReason;
    gameOver: boolean;
    lastMove: AppliedMove | null;
  };
  clock: {
    whiteMs: number;
    blackMs: number;
    serverTime: number;
  };
  drawOfferFrom: PieceColor | null;
  outcome: {
    reason: MatchOutcomeReason;
    winner: PieceColor | null;
  };
}

export type ClientWsMessage =
  | {
      type: 'room:create';
      timeControlId?: TimeControlId;
      preferredSide?: PreferredSide;
      avatar?: OnlinePersonaId;
      authToken?: string;
      displayName?: string;
    }
  | {
      type: 'room:join';
      roomId: string;
      avatar?: OnlinePersonaId;
      playerToken?: string;
      authToken?: string;
      displayName?: string;
    }
  | {
      type: 'room:reconnect';
      roomId: string;
      playerToken: string;
      authToken?: string;
    }
  | { type: 'room:leave' }
  | {
      type: 'move:submit';
      fromR: number;
      fromC: number;
      toR: number;
      toC: number;
      promotion?: PromotionPieceType;
    }
  | { type: 'match:resign' }
  | { type: 'match:draw_offer' }
  | { type: 'match:draw_respond'; accept: boolean }
  | { type: 'match:rematch' };

export type ServerWsMessage =
  | {
      type: 'room:joined';
      roomId: string;
      yourColor: PieceColor;
      playerToken: string;
      state: PublicRoomState;
    }
  | {
      type: 'room:rematch_started';
      roomId: string;
      yourColor: PieceColor;
      state: PublicRoomState;
    }
  | {
      type: 'room:state';
      state: PublicRoomState;
    }
  | {
      type: 'move:applied';
      move: AppliedMove;
      state: PublicRoomState;
    }
  | {
      type: 'clock:sync';
      whiteMs: number;
      blackMs: number;
      currentTurn: PieceColor;
      serverTime: number;
    }
  | {
      type: 'match:ended';
      outcome: { reason: MatchOutcomeReason; winner: PieceColor | null };
      state: PublicRoomState;
    }
  | {
      type: 'room:error';
      message: string;
    };
