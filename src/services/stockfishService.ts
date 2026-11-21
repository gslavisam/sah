import {
  type PieceColor,
  type ParsedUciMove,
  type StockfishEval,
  getStockfishEloProfile,
  normalizeScoreToWhite,
  parseUciMove,
} from '../shared/chessRules';

const STOCKFISH_WORKER_URL = '/stockfish/stockfish-19-lite-single.js';

export interface StockfishHintResult {
  move: ParsedUciMove;
  evalState: StockfishEval;
}

export interface StockfishBotMoveResult {
  move: ParsedUciMove;
  eloLabel: string;
  evalState: StockfishEval;
}

interface SearchOutcome {
  evalState: StockfishEval;
  bestMoveUci: string | null;
}

interface QueuedSearchJob {
  epoch: number;
  sideToMove: PieceColor;
  commands: string[];
  timeoutMs: number;
  resolve: (result: SearchOutcome | null) => void;
  cancelled: boolean;
  latestScore: { whiteCp: number; mateIn: number | null; depth?: number; pvMove?: string | null };
  timeoutHandle: ReturnType<typeof setTimeout> | null;
}

function getFenSideToMove(fen: string): PieceColor {
  const parts = fen.trim().split(/\s+/);
  return parts[1] === 'b' ? 'b' : 'w';
}

function parseInfoLine(
  line: string,
  sideToMove: PieceColor
): {
  whiteCp?: number;
  mateIn?: number | null;
  depth?: number;
  pvMove?: string | null;
  isBound?: boolean;
} | null {
  if (!line.startsWith('info ')) return null;
  const scoreMatch = line.match(/\bscore\s+(cp|mate)\s+(-?\d+)/);
  if (!scoreMatch) return null;

  const isBound = /\b(upperbound|lowerbound)\b/.test(line);
  const scoreType = scoreMatch[1] as 'cp' | 'mate';
  const rawValue = Number.parseInt(scoreMatch[2], 10);
  if (Number.isNaN(rawValue)) return null;

  const normalized = normalizeScoreToWhite(scoreType, rawValue, sideToMove);
  const depthMatch = line.match(/\bdepth\s+(\d+)/);
  const pvMatch = line.match(/\bpv\s+([a-h][1-8][a-h][1-8][qrbn]?)/);

  return {
    whiteCp: normalized.whiteCp,
    mateIn: normalized.mateIn,
    depth: depthMatch ? Number.parseInt(depthMatch[1], 10) : undefined,
    pvMove: pvMatch ? pvMatch[1] : null,
    isBound,
  };
}

class StockfishService {
  private worker: Worker | null = null;
  private readyPromise: Promise<boolean> | null = null;
  private isReady = false;
  private disabled = false;
  private epoch = 0;

  private initWaiters: {
    onUciOk?: () => void;
    onReadyOk?: () => void;
  } = {};

  private activeJob: QueuedSearchJob | null = null;
  private queue: QueuedSearchJob[] = [];

  public isSupportedEnvironment(): boolean {
    if (this.disabled) return false;
    if (typeof window === 'undefined' || typeof Worker === 'undefined') return false;
    if (typeof navigator !== 'undefined' && navigator.webdriver) return false;
    return true;
  }

  public init(): Promise<boolean> {
    if (!this.isSupportedEnvironment()) {
      return Promise.resolve(false);
    }
    if (this.isReady && this.worker) {
      return Promise.resolve(true);
    }
    if (this.readyPromise) {
      return this.readyPromise;
    }

    this.readyPromise = new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(initTimer);
        if (!ok) {
          this.readyPromise = null;
        }
        resolve(ok);
      };

      const initTimer = setTimeout(() => {
        console.warn('Stockfish WASM init timed out; falling back to JS chess AI.');
        this.disabled = true;
        this.cleanupWorker();
        finish(false);
      }, 8000);

      try {
        const worker = new Worker(STOCKFISH_WORKER_URL);
        this.worker = worker;

        worker.onmessage = (event: MessageEvent) => {
          const text = typeof event.data === 'string' ? event.data : String(event.data ?? '');
          const lines = text.split(/\r?\n/);
          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (line) this.handleWorkerLine(line);
          }
        };

        worker.onerror = (err) => {
          console.warn('Stockfish worker error; using JS fallback:', err);
          this.disabled = true;
          this.cleanupWorker();
          finish(false);
        };

        this.initWaiters.onUciOk = () => {
          this.post('setoption name Hash value 16');
          this.post('isready');
        };

        this.initWaiters.onReadyOk = () => {
          this.isReady = true;
          finish(true);
        };

        this.post('uci');
      } catch (err) {
        console.warn('Could not start Stockfish worker:', err);
        this.disabled = true;
        this.cleanupWorker();
        finish(false);
      }
    });

    return this.readyPromise;
  }

  private cleanupWorker() {
    if (this.activeJob) {
      if (this.activeJob.timeoutHandle) clearTimeout(this.activeJob.timeoutHandle);
      if (!this.activeJob.cancelled) {
        this.activeJob.cancelled = true;
        this.activeJob.resolve(null);
      }
      this.activeJob = null;
    }
    while (this.queue.length > 0) {
      const job = this.queue.shift();
      job?.resolve(null);
    }
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {
        // ignore termination error
      }
      this.worker = null;
    }
    this.isReady = false;
  }

  private post(cmd: string) {
    try {
      this.worker?.postMessage(cmd);
    } catch {
      // ignore closed worker
    }
  }

  private handleWorkerLine(line: string) {
    if (line === 'uciok') {
      const cb = this.initWaiters.onUciOk;
      this.initWaiters.onUciOk = undefined;
      cb?.();
      return;
    }

    if (line === 'readyok') {
      const cb = this.initWaiters.onReadyOk;
      this.initWaiters.onReadyOk = undefined;
      cb?.();
      return;
    }

    const job = this.activeJob;
    if (!job) return;

    if (line.startsWith('info ')) {
      const parsed = parseInfoLine(line, job.sideToMove);
      if (parsed && (!parsed.isBound || job.latestScore.depth === undefined)) {
        if (typeof parsed.whiteCp === 'number') {
          job.latestScore.whiteCp = parsed.whiteCp;
        }
        if (parsed.mateIn !== undefined) {
          job.latestScore.mateIn = parsed.mateIn;
        }
        if (typeof parsed.depth === 'number') {
          job.latestScore.depth = parsed.depth;
        }
        if (parsed.pvMove) {
          job.latestScore.pvMove = parsed.pvMove;
        }
      }
      return;
    }

    if (line.startsWith('bestmove ')) {
      if (job.timeoutHandle) {
        clearTimeout(job.timeoutHandle);
        job.timeoutHandle = null;
      }
      const token = line.split(/\s+/)[1] || '';
      const bestMoveUci = token && token !== '(none)' ? token : job.latestScore.pvMove || null;
      const result: SearchOutcome = {
        evalState: {
          whiteCp: job.latestScore.whiteCp,
          mateIn: job.latestScore.mateIn,
          bestMoveUci,
          depth: job.latestScore.depth,
        },
        bestMoveUci,
      };
      this.activeJob = null;
      if (!job.cancelled) {
        job.resolve(result);
      }
      this.pumpQueue();
    }
  }

  private pumpQueue() {
    if (this.activeJob || !this.isReady || !this.worker) return;

    while (this.queue.length > 0) {
      const next = this.queue.shift();
      if (!next) continue;
      if (next.cancelled || next.epoch !== this.epoch) {
        next.resolve(null);
        continue;
      }

      this.activeJob = next;
      next.timeoutHandle = setTimeout(() => {
        if (this.activeJob !== next) return;
        this.post('stop');
        const finishTimedOut = setTimeout(() => {
          if (this.activeJob !== next) return;
          this.activeJob = null;
          if (!next.cancelled) {
            next.cancelled = true;
            next.resolve(null);
          }
          this.pumpQueue();
        }, 500);
        // Replace timeoutHandle with the force-release handle if stop doesn't emit bestmove
        next.timeoutHandle = finishTimedOut;
      }, next.timeoutMs);

      for (const cmd of next.commands) {
        this.post(cmd);
      }
      return;
    }
  }

  private async enqueueSearch(
    fen: string,
    commands: string[],
    timeoutMs: number
  ): Promise<SearchOutcome | null> {
    const jobEpoch = this.epoch;
    const ok = await this.init();
    if (!ok || jobEpoch !== this.epoch) {
      return null;
    }

    return new Promise<SearchOutcome | null>((resolve) => {
      const job: QueuedSearchJob = {
        epoch: jobEpoch,
        sideToMove: getFenSideToMove(fen),
        commands,
        timeoutMs,
        resolve,
        cancelled: false,
        latestScore: { whiteCp: 0, mateIn: null },
        timeoutHandle: null,
      };
      this.queue.push(job);
      this.pumpQueue();
    });
  }

  public cancelPending() {
    this.epoch += 1;
    while (this.queue.length > 0) {
      const job = this.queue.shift();
      if (job && !job.cancelled) {
        job.cancelled = true;
        job.resolve(null);
      }
    }
    if (this.activeJob && !this.activeJob.cancelled) {
      const stoppedJob = this.activeJob;
      stoppedJob.cancelled = true;
      stoppedJob.resolve(null);
      if (stoppedJob.timeoutHandle) {
        clearTimeout(stoppedJob.timeoutHandle);
      }
      this.post('stop');
      stoppedJob.timeoutHandle = setTimeout(() => {
        if (this.activeJob === stoppedJob) {
          this.activeJob = null;
          this.pumpQueue();
        }
      }, 600);
    }
  }

  public newGame() {
    this.cancelPending();
    if (this.isReady && this.worker && !this.activeJob) {
      this.post('ucinewgame');
    }
  }

  public async evaluatePosition(fen: string, movetimeMs = 120): Promise<StockfishEval | null> {
    if (!fen || !this.isSupportedEnvironment()) return null;
    const outcome = await this.enqueueSearch(
      fen,
      [
        'setoption name UCI_LimitStrength value false',
        `position fen ${fen}`,
        `go movetime ${Math.max(40, Math.round(movetimeMs))}`,
      ],
      Math.max(2500, movetimeMs + 2200)
    );
    return outcome ? outcome.evalState : null;
  }

  public async getHintMove(fen: string, movetimeMs = 240): Promise<StockfishHintResult | null> {
    if (!fen || !this.isSupportedEnvironment()) return null;
    const outcome = await this.enqueueSearch(
      fen,
      [
        'setoption name UCI_LimitStrength value false',
        `position fen ${fen}`,
        `go movetime ${Math.max(80, Math.round(movetimeMs))}`,
      ],
      Math.max(3000, movetimeMs + 2400)
    );
    if (!outcome?.bestMoveUci) return null;
    const parsed = parseUciMove(outcome.bestMoveUci);
    if (!parsed) return null;
    return {
      move: parsed,
      evalState: outcome.evalState,
    };
  }

  public async chooseBotMove(
    fen: string,
    personaId: string,
    difficulty: string
  ): Promise<StockfishBotMoveResult | null> {
    if (!fen || !this.isSupportedEnvironment()) return null;
    const profile = getStockfishEloProfile(personaId, difficulty);
    const outcome = await this.enqueueSearch(
      fen,
      [
        'setoption name UCI_LimitStrength value true',
        `setoption name UCI_Elo value ${profile.uciElo}`,
        `position fen ${fen}`,
        `go movetime ${profile.movetimeMs}`,
      ],
      Math.max(3000, profile.movetimeMs + 2400)
    );
    if (!outcome?.bestMoveUci) return null;
    const parsed = parseUciMove(outcome.bestMoveUci);
    if (!parsed) return null;
    return {
      move: parsed,
      eloLabel: profile.label,
      evalState: outcome.evalState,
    };
  }

  public terminate() {
    this.epoch += 1;
    this.cleanupWorker();
    this.readyPromise = null;
  }
}

export const stockfishService = new StockfishService();
