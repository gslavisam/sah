import crypto from 'crypto';
import express from 'express';
import type { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { WebSocket, WebSocketServer } from 'ws';
import {
  applyChessMove,
  createInitialChessState,
  serializeBoard,
} from './src/shared/chessRules.ts';
import type { ChessRulesState, PieceColor } from './src/shared/chessRules.ts';
import { TIME_CONTROLS } from './src/shared/multiplayerTypes.ts';
import type {
  ClientWsMessage,
  MatchOutcomeReason,
  OnlinePersonaId,
  PublicRoomState,
  RoomStatus,
  ServerWsMessage,
  TimeControlId,
  TimeControlPreset,
} from './src/shared/multiplayerTypes.ts';

import { createAuthStore, sanitizeDisplayName } from './src/server/authStore.ts';
import type { MatchResult } from './src/shared/authTypes.ts';

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const isProd = process.env.NODE_ENV === 'production';

interface PlayerSlot {
  token: string;
  avatar: OnlinePersonaId;
  connected: boolean;
  rematchRequested: boolean;
  ws: WebSocket | null;
  userId: string | null;
  displayName: string;
  levelTitle: string;
}

interface RoomRecord {
  roomId: string;
  status: RoomStatus;
  timeControl: TimeControlPreset;
  players: {
    w: PlayerSlot | null;
    b: PlayerSlot | null;
  };
  chess: ChessRulesState;
  clock: {
    whiteMs: number;
    blackMs: number;
    lastTickAt: number | null;
  };
  drawOfferFrom: PieceColor | null;
  outcome: {
    reason: MatchOutcomeReason;
    winner: PieceColor | null;
  };
  matchRecorded: boolean;
  updatedAt: number;
}

interface SocketMeta {
  roomId: string | null;
  color: PieceColor | null;
  token: string | null;
}

const rooms = new Map<string, RoomRecord>();
const socketMeta = new WeakMap<WebSocket, SocketMeta>();

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const VALID_AVATARS: OnlinePersonaId[] = ['mentor', 'roast', 'rival'];

function sanitizeAvatar(val: unknown): OnlinePersonaId {
  if (typeof val === 'string' && VALID_AVATARS.includes(val as OnlinePersonaId)) {
    return val as OnlinePersonaId;
  }
  return 'mentor';
}

function sanitizeTimeControl(val: unknown): TimeControlPreset {
  if (typeof val === 'string' && val in TIME_CONTROLS) {
    return TIME_CONTROLS[val as TimeControlId];
  }
  return TIME_CONTROLS['5+0'];
}

function generateRoomId(): string {
  for (let attempt = 0; attempt < 20; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += ROOM_CODE_CHARS[crypto.randomInt(0, ROOM_CODE_CHARS.length)];
    }
    if (!rooms.has(code)) return code;
  }
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

function generateToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

function sendJson(ws: WebSocket | null, payload: ServerWsMessage): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(payload));
}

function getEffectiveClocks(room: RoomRecord, now: number): { whiteMs: number; blackMs: number } {
  let whiteMs = room.clock.whiteMs;
  let blackMs = room.clock.blackMs;
  if (room.status === 'playing' && room.clock.lastTickAt !== null) {
    const elapsed = Math.max(0, now - room.clock.lastTickAt);
    if (room.chess.currentTurn === 'w') {
      whiteMs = Math.max(0, whiteMs - elapsed);
    } else {
      blackMs = Math.max(0, blackMs - elapsed);
    }
  }
  return { whiteMs, blackMs };
}

function commitActiveClockElapsed(room: RoomRecord, now: number): boolean {
  if (room.status !== 'playing' || room.clock.lastTickAt === null) {
    return false;
  }
  const elapsed = Math.max(0, now - room.clock.lastTickAt);
  room.clock.lastTickAt = now;
  if (room.chess.currentTurn === 'w') {
    room.clock.whiteMs = Math.max(0, room.clock.whiteMs - elapsed);
    if (room.clock.whiteMs <= 0) {
      room.status = 'ended';
      room.clock.lastTickAt = null;
      room.chess.gameOver = true;
      room.outcome = { reason: 'timeout', winner: 'b' };
      return true;
    }
  } else {
    room.clock.blackMs = Math.max(0, room.clock.blackMs - elapsed);
    if (room.clock.blackMs <= 0) {
      room.status = 'ended';
      room.clock.lastTickAt = null;
      room.chess.gameOver = true;
      room.outcome = { reason: 'timeout', winner: 'w' };
      return true;
    }
  }
  return false;
}

function toPublicRoomState(room: RoomRecord): PublicRoomState {
  const now = Date.now();
  const clocks = getEffectiveClocks(room, now);
  return {
    roomId: room.roomId,
    status: room.status,
    timeControl: room.timeControl,
    players: {
      w: room.players.w
        ? {
            connected: room.players.w.connected,
            avatar: room.players.w.avatar,
            rematchRequested: room.players.w.rematchRequested,
            displayName: room.players.w.displayName,
            levelTitle: room.players.w.levelTitle,
          }
        : null,
      b: room.players.b
        ? {
            connected: room.players.b.connected,
            avatar: room.players.b.avatar,
            rematchRequested: room.players.b.rematchRequested,
            displayName: room.players.b.displayName,
            levelTitle: room.players.b.levelTitle,
          }
        : null,
    },
    chess: {
      board: serializeBoard(room.chess.board),
      currentTurn: room.chess.currentTurn,
      enPassantTarget: room.chess.enPassantTarget ? { ...room.chess.enPassantTarget } : null,
      halfMoveClock: room.chess.halfMoveClock,
      positionHistory: room.chess.positionHistory.slice(),
      moveCount: room.chess.moveCount,
      inCheck: room.chess.inCheck,
      isCheckmate: room.chess.isCheckmate,
      drawReason: room.chess.drawReason,
      gameOver: room.chess.gameOver,
      lastMove: room.chess.lastMove ? { ...room.chess.lastMove } : null,
    },
    clock: {
      whiteMs: clocks.whiteMs,
      blackMs: clocks.blackMs,
      serverTime: now,
    },
    drawOfferFrom: room.drawOfferFrom,
    outcome: { ...room.outcome },
  };
}

function broadcastRoom(room: RoomRecord, payload: ServerWsMessage): void {
  sendJson(room.players.w?.ws ?? null, payload);
  sendJson(room.players.b?.ws ?? null, payload);
}

function detachSocketFromCurrentRoom(ws: WebSocket): void {
  const meta = socketMeta.get(ws);
  if (!meta || !meta.roomId || !meta.color) return;
  const room = rooms.get(meta.roomId);
  if (room) {
    const slot = room.players[meta.color];
    if (slot && slot.token === meta.token) {
      slot.connected = false;
      slot.ws = null;
      room.updatedAt = Date.now();
      broadcastRoom(room, { type: 'room:state', state: toPublicRoomState(room) });
    }
  }
  socketMeta.set(ws, { roomId: null, color: null, token: null });
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || '').trim();
  if (!apiKey) return null;
  try {
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.warn('Gemini server client init error:', err);
    return null;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  const authStore = createAuthStore();
  const authRateBuckets = new Map<string, { count: number; resetAt: number }>();

  function checkAuthRateLimit(req: Request, res: Response): boolean {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const existing = authRateBuckets.get(key);
    if (!existing || existing.resetAt <= now) {
      authRateBuckets.set(key, { count: 1, resetAt: now + 10 * 60_000 });
      return true;
    }
    if (existing.count >= 25) {
      res.status(429).json({ error: 'Previše pokušaja prijave. Sačekaj nekoliko minuta.' });
      return false;
    }
    existing.count += 1;
    return true;
  }

  function extractBearerToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (typeof authHeader !== 'string') return null;
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() : null;
  }

  function resolveWsPlayerIdentity(
    authToken?: unknown,
    fallbackDisplayName?: unknown
  ): { userId: string | null; displayName: string; levelTitle: string } {
    if (typeof authToken === 'string' && authToken.trim()) {
      const sess = authStore.getSessionUser(authToken.trim());
      if (sess) {
        return {
          userId: sess.user.id,
          displayName: sess.user.displayName,
          levelTitle: sess.user.stats.title,
        };
      }
    }
    return {
      userId: null,
      displayName: sanitizeDisplayName(fallbackDisplayName, 'Gost'),
      levelTitle: 'Gost',
    };
  }

  function recordCompletedOnlineRoom(room: RoomRecord): void {
    if (room.matchRecorded || room.status !== 'ended') return;
    room.matchRecorded = true;
    for (const col of ['w', 'b'] as PieceColor[]) {
      const slot = room.players[col];
      if (!slot || !slot.userId) continue;
      const oppSlot = room.players[col === 'w' ? 'b' : 'w'];
      const oppName = oppSlot?.displayName || 'Protivnik';
      const result: MatchResult =
        room.outcome.winner === null ? 'draw' : room.outcome.winner === col ? 'win' : 'loss';
      try {
        authStore.recordMatch(slot.userId, {
          mode: 'online',
          playerColor: col,
          opponentName: oppName,
          result,
          reason: room.outcome.reason || 'completed',
          moveCount: room.chess.moveCount,
        });
      } catch (err) {
        console.warn('Failed to record online match for user:', err);
      }
    }
  }

  app.post('/api/auth/register', (req: Request, res: Response) => {
    if (!checkAuthRateLimit(req, res)) return;
    const result = authStore.registerUser({
      username: req.body?.username,
      password: req.body?.password,
      displayName: req.body?.displayName,
      guestStats: req.body?.guestStats,
      guestAcademy: req.body?.guestAcademy,
    });
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json(result.data);
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    if (!checkAuthRateLimit(req, res)) return;
    const result = authStore.loginUser({
      username: req.body?.username,
      password: req.body?.password,
      guestStats: req.body?.guestStats,
      guestAcademy: req.body?.guestAcademy,
    });
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json(result.data);
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const token = extractBearerToken(req);
    if (token) {
      authStore.logoutSession(token);
    }
    res.json({ ok: true });
  });

  app.get('/api/auth/me', (req: Request, res: Response) => {
    const token = extractBearerToken(req);
    const session = authStore.getSessionUser(token);
    if (!session) {
      res.status(401).json({ error: 'Sesija nije validna.' });
      return;
    }
    res.json(session);
  });

  app.patch('/api/profile/display-name', (req: Request, res: Response) => {
    const token = extractBearerToken(req);
    const session = authStore.getSessionUser(token);
    if (!session) {
      res.status(401).json({ error: 'Moraš biti prijavljen.' });
      return;
    }
    const result = authStore.updateDisplayName(session.user.id, req.body?.displayName);
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ user: result.user });
  });

  app.put('/api/profile/progress', (req: Request, res: Response) => {
    const token = extractBearerToken(req);
    const session = authStore.getSessionUser(token);
    if (!session) {
      res.status(401).json({ error: 'Moraš biti prijavljen.' });
      return;
    }
    const user = authStore.syncProgress(
      session.user.id,
      req.body?.stats,
      req.body?.academyProgress
    );
    if (!user) {
      res.status(404).json({ error: 'Korisnik nije pronađen.' });
      return;
    }
    res.json({ user });
  });

  app.post('/api/profile/matches', (req: Request, res: Response) => {
    const token = extractBearerToken(req);
    const session = authStore.getSessionUser(token);
    if (!session) {
      res.status(401).json({ error: 'Moraš biti prijavljen.' });
      return;
    }
    const rawResult = req.body?.result;
    const validResult: MatchResult =
      rawResult === 'win' || rawResult === 'loss' || rawResult === 'draw' ? rawResult : 'draw';
    const playerColor: PieceColor = req.body?.playerColor === 'b' ? 'b' : 'w';
    const opponentName = sanitizeDisplayName(req.body?.opponentName, 'AI Protivnik');
    const reason = typeof req.body?.reason === 'string' ? req.body.reason : 'completed';
    const moveCount = Number(req.body?.moveCount) || 0;

    const updated = authStore.recordMatch(session.user.id, {
      mode: 'single',
      playerColor,
      opponentName,
      result: validResult,
      reason,
      moveCount,
    });
    res.json(updated);
  });

  app.get('/api/gemini/status', (_req: Request, res: Response) => {
    const configured = Boolean((process.env.GEMINI_API_KEY || process.env.API_KEY || '').trim());
    res.json({ configured });
  });

  app.post('/api/gemini/generate', async (req: Request, res: Response) => {
    const client = getGeminiClient();
    if (!client) {
      res.json({ text: null, configured: false });
      return;
    }

    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required.' });
      return;
    }

    try {
      let response = null;
      let lastErr: unknown = null;
      const delaysMs = [0, 400, 900];
      for (let attempt = 0; attempt < delaysMs.length; attempt++) {
        if (delaysMs[attempt] > 0) {
          await new Promise((resolve) => setTimeout(resolve, delaysMs[attempt]));
        }
        try {
          response = await client.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: prompt,
            config: {
              thinkingConfig: {
                thinkingLevel: ThinkingLevel.LOW,
              },
            },
          });
          break;
        } catch (err: unknown) {
          lastErr = err;
          const status = (err as { status?: number })?.status;
          const retryable = status === 429 || (typeof status === 'number' && status >= 500 && status < 600);
          if (!retryable || attempt === delaysMs.length - 1) {
            throw err;
          }
        }
      }
      if (!response && lastErr) throw lastErr;
      res.json({ text: response?.text?.trim() || null, configured: true });
    } catch (err: unknown) {
      console.warn('Gemini server generateContent error:', err);
      const message = err instanceof Error ? err.message : 'Gemini request failed';
      res.status(502).json({ text: null, configured: true, error: message });
    }
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.use((_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req, socket, head) => {
    try {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      if (url.pathname === '/ws') {
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit('connection', ws, req);
        });
      }
    } catch {
      socket.destroy();
    }
  });

  wss.on('connection', (ws) => {
    socketMeta.set(ws, { roomId: null, color: null, token: null });

    ws.on('message', (raw) => {
      let msg: ClientWsMessage;
      try {
        msg = JSON.parse(String(raw)) as ClientWsMessage;
      } catch {
        sendJson(ws, { type: 'room:error', message: 'Neispravan format poruke.' });
        return;
      }

      if (!msg || typeof msg.type !== 'string') return;

      if (msg.type === 'room:create') {
        detachSocketFromCurrentRoom(ws);
        const roomId = generateRoomId();
        const timeControl = sanitizeTimeControl(msg.timeControlId);
        const avatar = sanitizeAvatar(msg.avatar);
        const identity = resolveWsPlayerIdentity(msg.authToken, msg.displayName);
        const side: PieceColor =
          msg.preferredSide === 'w'
            ? 'w'
            : msg.preferredSide === 'b'
              ? 'b'
              : crypto.randomInt(0, 2) === 0
                ? 'w'
                : 'b';
        const token = generateToken();
        const slot: PlayerSlot = {
          token,
          avatar,
          connected: true,
          rematchRequested: false,
          ws,
          userId: identity.userId,
          displayName: identity.displayName,
          levelTitle: identity.levelTitle,
        };
        const room: RoomRecord = {
          roomId,
          status: 'waiting',
          timeControl,
          players: {
            w: side === 'w' ? slot : null,
            b: side === 'b' ? slot : null,
          },
          chess: createInitialChessState(),
          clock: {
            whiteMs: timeControl.baseMs,
            blackMs: timeControl.baseMs,
            lastTickAt: null,
          },
          drawOfferFrom: null,
          outcome: { reason: null, winner: null },
          matchRecorded: false,
          updatedAt: Date.now(),
        };
        rooms.set(roomId, room);
        socketMeta.set(ws, { roomId, color: side, token });
        sendJson(ws, {
          type: 'room:joined',
          roomId,
          yourColor: side,
          playerToken: token,
          state: toPublicRoomState(room),
        });
        return;
      }

      if (msg.type === 'room:join') {
        const cleanCode = String(msg.roomId || '')
          .trim()
          .toUpperCase();
        const room = rooms.get(cleanCode);
        if (!room) {
          sendJson(ws, { type: 'room:error', message: 'Soba sa tim kodom ne postoji ili je istekla.' });
          return;
        }

        const avatar = sanitizeAvatar(msg.avatar);
        const identity = resolveWsPlayerIdentity(msg.authToken, msg.displayName);
        const providedToken = typeof msg.playerToken === 'string' ? msg.playerToken : '';

        // Check reconnect token first
        for (const col of ['w', 'b'] as PieceColor[]) {
          const existing = room.players[col];
          if (existing && providedToken && existing.token === providedToken) {
            detachSocketFromCurrentRoom(ws);
            if (existing.ws && existing.ws !== ws) {
              try {
                existing.ws.close();
              } catch {
                // ignore
              }
            }
            existing.ws = ws;
            existing.connected = true;
            existing.avatar = avatar;
            if (identity.userId || msg.displayName) {
              existing.userId = identity.userId;
              existing.displayName = identity.displayName;
              existing.levelTitle = identity.levelTitle;
            }
            room.updatedAt = Date.now();
            socketMeta.set(ws, { roomId: room.roomId, color: col, token: existing.token });
            const publicState = toPublicRoomState(room);
            sendJson(ws, {
              type: 'room:joined',
              roomId: room.roomId,
              yourColor: col,
              playerToken: existing.token,
              state: publicState,
            });
            broadcastRoom(room, { type: 'room:state', state: publicState });
            return;
          }
        }

        const openColor: PieceColor | null = !room.players.w ? 'w' : !room.players.b ? 'b' : null;
        if (!openColor) {
          sendJson(ws, { type: 'room:error', message: 'Ova soba je već popunjena.' });
          return;
        }

        detachSocketFromCurrentRoom(ws);
        const token = generateToken();
        room.players[openColor] = {
          token,
          avatar,
          connected: true,
          rematchRequested: false,
          ws,
          userId: identity.userId,
          displayName: identity.displayName,
          levelTitle: identity.levelTitle,
        };
        if (room.players.w && room.players.b && room.status === 'waiting') {
          room.status = 'playing';
          room.clock.lastTickAt = Date.now();
        }
        room.updatedAt = Date.now();
        socketMeta.set(ws, { roomId: room.roomId, color: openColor, token });

        const publicState = toPublicRoomState(room);
        sendJson(ws, {
          type: 'room:joined',
          roomId: room.roomId,
          yourColor: openColor,
          playerToken: token,
          state: publicState,
        });
        broadcastRoom(room, { type: 'room:state', state: publicState });
        return;
      }

      if (msg.type === 'room:reconnect') {
        const cleanCode = String(msg.roomId || '')
          .trim()
          .toUpperCase();
        const room = rooms.get(cleanCode);
        if (!room) {
          sendJson(ws, { type: 'room:error', message: 'Prethodna online partija više nije aktivna.' });
          return;
        }
        const identity = msg.authToken ? resolveWsPlayerIdentity(msg.authToken) : null;
        for (const col of ['w', 'b'] as PieceColor[]) {
          const slot = room.players[col];
          if (slot && slot.token === msg.playerToken) {
            detachSocketFromCurrentRoom(ws);
            slot.ws = ws;
            slot.connected = true;
            if (identity && identity.userId) {
              slot.userId = identity.userId;
              slot.displayName = identity.displayName;
              slot.levelTitle = identity.levelTitle;
            }
            room.updatedAt = Date.now();
            socketMeta.set(ws, { roomId: room.roomId, color: col, token: slot.token });
            const publicState = toPublicRoomState(room);
            sendJson(ws, {
              type: 'room:joined',
              roomId: room.roomId,
              yourColor: col,
              playerToken: slot.token,
              state: publicState,
            });
            broadcastRoom(room, { type: 'room:state', state: publicState });
            return;
          }
        }
        sendJson(ws, { type: 'room:error', message: 'Sesija za ovu sobu nije pronađena.' });
        return;
      }

      if (msg.type === 'room:leave') {
        detachSocketFromCurrentRoom(ws);
        return;
      }

      const meta = socketMeta.get(ws);
      if (!meta || !meta.roomId || !meta.color) {
        sendJson(ws, { type: 'room:error', message: 'Nisi povezan ni sa jednom sobom.' });
        return;
      }
      const room = rooms.get(meta.roomId);
      if (!room) {
        sendJson(ws, { type: 'room:error', message: 'Soba više ne postoji.' });
        return;
      }

      if (msg.type === 'move:submit') {
        if (room.status !== 'playing') {
          sendJson(ws, { type: 'room:error', message: 'Partija trenutno nije aktivna.' });
          return;
        }
        if (room.chess.currentTurn !== meta.color) {
          sendJson(ws, { type: 'room:error', message: 'Sačekaj potez protivnika.' });
          return;
        }

        const now = Date.now();
        const timedOut = commitActiveClockElapsed(room, now);
        if (timedOut) {
          room.updatedAt = now;
          recordCompletedOnlineRoom(room);
          const endedState = toPublicRoomState(room);
          broadcastRoom(room, { type: 'match:ended', outcome: room.outcome, state: endedState });
          return;
        }

        const result = applyChessMove(
          room.chess,
          msg.fromR,
          msg.fromC,
          msg.toR,
          msg.toC,
          msg.promotion
        );
        if (!result.ok) {
          sendJson(ws, { type: 'room:error', message: result.error });
          return;
        }

        // Apply Fischer increment to the side that just moved
        if (!result.state.gameOver && room.timeControl.incrementMs > 0) {
          if (meta.color === 'w') {
            room.clock.whiteMs += room.timeControl.incrementMs;
          } else {
            room.clock.blackMs += room.timeControl.incrementMs;
          }
        }

        room.chess = result.state;
        room.drawOfferFrom = null;
        room.updatedAt = now;

        if (room.chess.gameOver) {
          room.status = 'ended';
          room.clock.lastTickAt = null;
          if (room.chess.isCheckmate) {
            room.outcome = { reason: 'checkmate', winner: meta.color };
          } else {
            room.outcome = { reason: room.chess.drawReason || 'stalemate', winner: null };
          }
          recordCompletedOnlineRoom(room);
          const publicState = toPublicRoomState(room);
          broadcastRoom(room, { type: 'move:applied', move: result.move, state: publicState });
          broadcastRoom(room, { type: 'match:ended', outcome: room.outcome, state: publicState });
        } else {
          room.clock.lastTickAt = now;
          const publicState = toPublicRoomState(room);
          broadcastRoom(room, { type: 'move:applied', move: result.move, state: publicState });
        }
        return;
      }

      if (msg.type === 'match:resign') {
        if (room.status !== 'playing') return;
        const winner: PieceColor = meta.color === 'w' ? 'b' : 'w';
        room.status = 'ended';
        room.clock.lastTickAt = null;
        room.chess.gameOver = true;
        room.drawOfferFrom = null;
        room.outcome = { reason: 'resign', winner };
        room.updatedAt = Date.now();
        recordCompletedOnlineRoom(room);
        const publicState = toPublicRoomState(room);
        broadcastRoom(room, { type: 'match:ended', outcome: room.outcome, state: publicState });
        return;
      }

      if (msg.type === 'match:draw_offer') {
        if (room.status !== 'playing') return;
        room.drawOfferFrom = meta.color;
        room.updatedAt = Date.now();
        broadcastRoom(room, { type: 'room:state', state: toPublicRoomState(room) });
        return;
      }

      if (msg.type === 'match:draw_respond') {
        if (room.status !== 'playing' || !room.drawOfferFrom || room.drawOfferFrom === meta.color) {
          return;
        }
        if (msg.accept) {
          room.status = 'ended';
          room.clock.lastTickAt = null;
          room.chess.gameOver = true;
          room.drawOfferFrom = null;
          room.outcome = { reason: 'draw_agreed', winner: null };
          room.updatedAt = Date.now();
          recordCompletedOnlineRoom(room);
          const publicState = toPublicRoomState(room);
          broadcastRoom(room, { type: 'match:ended', outcome: room.outcome, state: publicState });
        } else {
          room.drawOfferFrom = null;
          room.updatedAt = Date.now();
          broadcastRoom(room, { type: 'room:state', state: toPublicRoomState(room) });
        }
        return;
      }

      if (msg.type === 'match:rematch') {
        if (room.status !== 'ended') return;
        const slot = room.players[meta.color];
        if (!slot) return;
        slot.rematchRequested = true;
        room.updatedAt = Date.now();

        if (room.players.w?.rematchRequested && room.players.b?.rematchRequested) {
          const prevWhite = room.players.w;
          const prevBlack = room.players.b;
          prevWhite.rematchRequested = false;
          prevBlack.rematchRequested = false;

          // Swap colors for rematch
          room.players.w = prevBlack;
          room.players.b = prevWhite;
          room.chess = createInitialChessState();
          room.status = 'playing';
          room.clock = {
            whiteMs: room.timeControl.baseMs,
            blackMs: room.timeControl.baseMs,
            lastTickAt: Date.now(),
          };
          room.drawOfferFrom = null;
          room.outcome = { reason: null, winner: null };
          room.matchRecorded = false;

          if (room.players.w.ws) {
            socketMeta.set(room.players.w.ws, {
              roomId: room.roomId,
              color: 'w',
              token: room.players.w.token,
            });
          }
          if (room.players.b.ws) {
            socketMeta.set(room.players.b.ws, {
              roomId: room.roomId,
              color: 'b',
              token: room.players.b.token,
            });
          }

          const publicState = toPublicRoomState(room);
          sendJson(room.players.w.ws, {
            type: 'room:rematch_started',
            roomId: room.roomId,
            yourColor: 'w',
            state: publicState,
          });
          sendJson(room.players.b.ws, {
            type: 'room:rematch_started',
            roomId: room.roomId,
            yourColor: 'b',
            state: publicState,
          });
        } else {
          broadcastRoom(room, { type: 'room:state', state: toPublicRoomState(room) });
        }
      }
    });

    ws.on('close', () => {
      detachSocketFromCurrentRoom(ws);
    });
  });

  // Authoritative clock timeout & periodic sync + room garbage collection
  let tickCounter = 0;
  setInterval(() => {
    const now = Date.now();
    tickCounter += 1;

    for (const [roomId, room] of rooms.entries()) {
      if (room.status === 'playing') {
        const timedOut = commitActiveClockElapsed(room, now);
        if (timedOut) {
          room.updatedAt = now;
          recordCompletedOnlineRoom(room);
          const endedState = toPublicRoomState(room);
          broadcastRoom(room, { type: 'match:ended', outcome: room.outcome, state: endedState });
          continue;
        }
        if (tickCounter % 8 === 0) {
          broadcastRoom(room, {
            type: 'clock:sync',
            whiteMs: room.clock.whiteMs,
            blackMs: room.clock.blackMs,
            currentTurn: room.chess.currentTurn,
            serverTime: now,
          });
        }
      }

      const bothDisconnected = !room.players.w?.connected && !room.players.b?.connected;
      if (bothDisconnected && now - room.updatedAt > 15 * 60_000) {
        rooms.delete(roomId);
      } else if (now - room.updatedAt > 60 * 60_000) {
        rooms.delete(roomId);
      }
    }
  }, 250);

  httpServer.listen(PORT, HOST, () => {
    console.log(`Wizard Chess server listening on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
