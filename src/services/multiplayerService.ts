import type { AppliedMove, PieceColor, PromotionPieceType } from '../shared/chessRules';
import type {
  ClientWsMessage,
  MatchOutcomeReason,
  OnlinePersonaId,
  PreferredSide,
  PublicRoomState,
  ServerWsMessage,
  TimeControlId,
} from '../shared/multiplayerTypes';
import { authService } from './authService';

const SESSION_KEY = 'wizard_chess_online_session';

export interface OnlineSessionSnapshot {
  connectionState: 'disconnected' | 'connecting' | 'connected';
  roomId: string | null;
  yourColor: PieceColor | null;
  playerToken: string | null;
  roomState: PublicRoomState | null;
  error: string | null;
  clockAnchor: {
    whiteMs: number;
    blackMs: number;
    currentTurn: PieceColor;
    syncedAtPerf: number;
  } | null;
}

export interface MultiplayerEventHandlers {
  onRoomEntered?: (yourColor: PieceColor, state: PublicRoomState, isRematch: boolean) => void;
  onMoveApplied?: (move: AppliedMove, state: PublicRoomState) => void;
  onMatchEnded?: (
    outcome: { reason: MatchOutcomeReason; winner: PieceColor | null },
    state: PublicRoomState
  ) => void;
}

class MultiplayerService {
  private ws: WebSocket | null = null;
  private outgoingQueue: ClientWsMessage[] = [];
  private listeners = new Set<(snap: OnlineSessionSnapshot) => void>();
  private eventHandlers: MultiplayerEventHandlers = {};
  private manualLeave = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private state: OnlineSessionSnapshot = {
    connectionState: 'disconnected',
    roomId: null,
    yourColor: null,
    playerToken: null,
    roomState: null,
    error: null,
    clockAnchor: null,
  };

  public setEventHandlers(handlers: MultiplayerEventHandlers) {
    this.eventHandlers = handlers;
  }

  public getSnapshot(): OnlineSessionSnapshot {
    return this.state;
  }

  public subscribe(listener: (snap: OnlineSessionSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  private updateState(patch: Partial<OnlineSessionSnapshot>) {
    this.state = { ...this.state, ...patch };
    this.emit();
  }

  private saveStoredSession(roomId: string, playerToken: string) {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ roomId, playerToken }));
    } catch {
      // ignore storage failure
    }
  }

  private clearStoredSession() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore storage failure
    }
  }

  public getStoredSession(): { roomId: string; playerToken: string } | null {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { roomId?: string; playerToken?: string };
      if (parsed.roomId && parsed.playerToken) {
        return { roomId: parsed.roomId, playerToken: parsed.playerToken };
      }
      return null;
    } catch {
      return null;
    }
  }

  public getInviteCodeFromUrl(): string | null {
    if (typeof window === 'undefined') return null;
    const code = new URLSearchParams(window.location.search).get('duel');
    return code ? code.trim().toUpperCase() : null;
  }

  public buildInviteUrl(roomId: string): string {
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.href);
    url.searchParams.set('duel', roomId);
    return url.toString();
  }

  private clearInviteUrlParam() {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.searchParams.has('duel')) {
      url.searchParams.delete('duel');
      window.history.replaceState({}, '', url.toString());
    }
  }

  private ensureSocket() {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.manualLeave = false;
    this.updateState({ connectionState: 'connecting', error: null });

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    this.ws = ws;

    ws.addEventListener('open', () => {
      if (this.ws !== ws) return;
      this.updateState({ connectionState: 'connected', error: null });
      const pending = this.outgoingQueue.splice(0, this.outgoingQueue.length);
      for (const msg of pending) {
        ws.send(JSON.stringify(msg));
      }
    });

    ws.addEventListener('message', (event) => {
      if (this.ws !== ws) return;
      let msg: ServerWsMessage;
      try {
        msg = JSON.parse(String(event.data)) as ServerWsMessage;
      } catch {
        return;
      }
      this.handleServerMessage(msg);
    });

    ws.addEventListener('close', () => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.updateState({ connectionState: 'disconnected' });
      if (!this.manualLeave && this.state.roomId && this.state.playerToken) {
        this.reconnectTimer = setTimeout(() => {
          if (this.state.roomId && this.state.playerToken) {
            this.reconnectRoom(this.state.roomId, this.state.playerToken);
          }
        }, 1200);
      }
    });

    ws.addEventListener('error', () => {
      if (this.ws !== ws) return;
      this.updateState({ error: 'Veza sa serverom nije uspela. Pokušaj ponovo.' });
    });
  }

  private send(msg: ClientWsMessage) {
    this.ensureSocket();
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      this.outgoingQueue.push(msg);
    }
  }

  private handleServerMessage(msg: ServerWsMessage) {
    if (msg.type === 'room:error') {
      if (
        msg.message.includes('Prethodna online partija') ||
        msg.message.includes('Sesija za ovu sobu')
      ) {
        this.clearStoredSession();
        this.updateState({
          roomId: null,
          yourColor: null,
          playerToken: null,
          roomState: null,
          clockAnchor: null,
          error: msg.message,
        });
      } else {
        this.updateState({ error: msg.message });
      }
      return;
    }

    if (msg.type === 'room:joined' || msg.type === 'room:rematch_started') {
      const token = msg.type === 'room:joined' ? msg.playerToken : this.state.playerToken;
      if (token) {
        this.saveStoredSession(msg.roomId, token);
      }
      this.updateState({
        roomId: msg.roomId,
        yourColor: msg.yourColor,
        playerToken: token,
        roomState: msg.state,
        error: null,
        clockAnchor: {
          whiteMs: msg.state.clock.whiteMs,
          blackMs: msg.state.clock.blackMs,
          currentTurn: msg.state.chess.currentTurn,
          syncedAtPerf: performance.now(),
        },
      });
      this.eventHandlers.onRoomEntered?.(
        msg.yourColor,
        msg.state,
        msg.type === 'room:rematch_started'
      );
      return;
    }

    if (msg.type === 'room:state') {
      this.updateState({
        roomState: msg.state,
        error: null,
        clockAnchor: {
          whiteMs: msg.state.clock.whiteMs,
          blackMs: msg.state.clock.blackMs,
          currentTurn: msg.state.chess.currentTurn,
          syncedAtPerf: performance.now(),
        },
      });
      return;
    }

    if (msg.type === 'move:applied') {
      this.updateState({
        roomState: msg.state,
        error: null,
        clockAnchor: {
          whiteMs: msg.state.clock.whiteMs,
          blackMs: msg.state.clock.blackMs,
          currentTurn: msg.state.chess.currentTurn,
          syncedAtPerf: performance.now(),
        },
      });
      this.eventHandlers.onMoveApplied?.(msg.move, msg.state);
      return;
    }

    if (msg.type === 'clock:sync') {
      this.updateState({
        clockAnchor: {
          whiteMs: msg.whiteMs,
          blackMs: msg.blackMs,
          currentTurn: msg.currentTurn,
          syncedAtPerf: performance.now(),
        },
      });
      return;
    }

    if (msg.type === 'match:ended') {
      const wasAlreadyEnded = this.state.roomState?.status === 'ended';
      const yourColor = this.state.yourColor;
      this.updateState({
        roomState: msg.state,
        clockAnchor: {
          whiteMs: msg.state.clock.whiteMs,
          blackMs: msg.state.clock.blackMs,
          currentTurn: msg.state.chess.currentTurn,
          syncedAtPerf: performance.now(),
        },
      });
      if (!wasAlreadyEnded && yourColor) {
        if (authService.getSnapshot().user) {
          void authService.refreshProfile();
        } else {
          const oppColor: PieceColor = yourColor === 'w' ? 'b' : 'w';
          const oppName = msg.state.players[oppColor]?.displayName || 'Protivnik';
          const result =
            msg.outcome.winner === null
              ? 'draw'
              : msg.outcome.winner === yourColor
                ? 'win'
                : 'loss';
          authService.recordLocalGuestMatch({
            mode: 'online',
            playerColor: yourColor,
            opponentName: oppName,
            result,
            reason: msg.outcome.reason || 'completed',
            moveCount: msg.state.chess.moveCount,
          });
        }
      }
      this.eventHandlers.onMatchEnded?.(msg.outcome, msg.state);
    }
  }

  public getLiveClocks(): { whiteMs: number; blackMs: number } {
    const anchor = this.state.clockAnchor;
    const room = this.state.roomState;
    if (!anchor) return { whiteMs: 0, blackMs: 0 };
    if (!room || room.status !== 'playing') {
      return { whiteMs: anchor.whiteMs, blackMs: anchor.blackMs };
    }
    const elapsed = Math.max(0, performance.now() - anchor.syncedAtPerf);
    return {
      whiteMs: anchor.currentTurn === 'w' ? Math.max(0, anchor.whiteMs - elapsed) : anchor.whiteMs,
      blackMs: anchor.currentTurn === 'b' ? Math.max(0, anchor.blackMs - elapsed) : anchor.blackMs,
    };
  }

  public createRoom(
    timeControlId: TimeControlId,
    preferredSide: PreferredSide,
    avatar: OnlinePersonaId
  ) {
    this.updateState({ error: null });
    const identity = authService.getDuelIdentity();
    this.send({
      type: 'room:create',
      timeControlId,
      preferredSide,
      avatar,
      authToken: identity.authToken,
      displayName: identity.displayName,
    });
  }

  public joinRoom(roomId: string, avatar: OnlinePersonaId, playerToken?: string) {
    this.updateState({ error: null });
    const identity = authService.getDuelIdentity();
    this.send({
      type: 'room:join',
      roomId: roomId.trim().toUpperCase(),
      avatar,
      playerToken,
      authToken: identity.authToken,
      displayName: identity.displayName,
    });
  }

  public reconnectRoom(roomId: string, playerToken: string) {
    this.updateState({ error: null });
    const identity = authService.getDuelIdentity();
    this.send({
      type: 'room:reconnect',
      roomId,
      playerToken,
      authToken: identity.authToken,
    });
  }

  public submitMove(
    fromR: number,
    fromC: number,
    toR: number,
    toC: number,
    promotion?: PromotionPieceType
  ) {
    this.send({ type: 'move:submit', fromR, fromC, toR, toC, promotion });
  }

  public resign() {
    this.send({ type: 'match:resign' });
  }

  public offerDraw() {
    this.send({ type: 'match:draw_offer' });
  }

  public respondDraw(accept: boolean) {
    this.send({ type: 'match:draw_respond', accept });
  }

  public requestRematch() {
    this.send({ type: 'match:rematch' });
  }

  public leaveRoom() {
    this.manualLeave = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.outgoingQueue = [];
    this.clearStoredSession();
    this.clearInviteUrlParam();
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'room:leave' }));
      }
      this.ws.close();
      this.ws = null;
    }
    this.updateState({
      connectionState: 'disconnected',
      roomId: null,
      yourColor: null,
      playerToken: null,
      roomState: null,
      error: null,
      clockAnchor: null,
    });
  }

  public clearError() {
    if (this.state.error) {
      this.updateState({ error: null });
    }
  }
}

export const multiplayerService = new MultiplayerService();
