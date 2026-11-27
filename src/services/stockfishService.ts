import {
  type PieceColor,
  type ParsedUciMove,
  type StockfishEval,
  getStockfishEloProfile,
  normalizeScoreToWhite,
  parseUciMove,
} from '../shared/chessRules.ts';

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

interface MultiPvCandidate {
  pvIndex: number;
  moveUci: string;
  sideScoreCp: number;
  mateFromSide: number | null;
  depth: number;
}

interface SearchOutcome {
  evalState: StockfishEval;
  bestMoveUci: string | null;
  multiPvCandidates: MultiPvCandidate[];
  hasEvalScore: boolean;
}

interface QueuedSearchJob {
  epoch: number;
  sideToMove: PieceColor;
  commands: string[];
  timeoutMs: number;
  resolve: (result: SearchOutcome | null) => void;
  cancelled: boolean;
  latestScore: {
    whiteCp: number;
    mateIn: number | null;
    depth?: number;
    pvMove?: string | null;
    hasScore: boolean;
  };
  multiPvMap: Map<number, MultiPvCandidate>;
  timeoutHandle: ReturnType<typeof setTimeout> | null;
}

function getFenSideToMove(fen: string): PieceColor {
  const parts = fen.trim().split(/\s+/);
  return parts[1] === 'b' ? 'b' : 'w';
}

function scoreFromSideToCp(scoreType: 'cp' | 'mate', rawValue: number): number {
  if (scoreType === 'mate') {
    if (rawValue === 0) return -10000;
    return rawValue > 0 ? 10000 - rawValue * 40 : -10000 - rawValue * 40;
  }
  return rawValue;
}

function parseInfoLine(
  line: string,
  sideToMove: PieceColor
): {
  whiteCp?: number;
  mateIn?: number | null;
  depth?: number;
  pvIndex: number;
  sideScoreCp: number;
  mateFromSide: number | null;
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
  const multiPvMatch = line.match(/\bmultipv\s+(\d+)/);
  const pvMatch = line.match(/\bpv\s+([a-h][1-8][a-h][1-8][qrbn]?)/);

  return {
    whiteCp: normalized.whiteCp,
    mateIn: normalized.mateIn,
    depth: depthMatch ? Number.parseInt(depthMatch[1], 10) : undefined,
    pvIndex: multiPvMatch ? Number.parseInt(multiPvMatch[1], 10) : 1,
    sideScoreCp: scoreFromSideToCp(scoreType, rawValue),
    mateFromSide: scoreType === 'mate' ? rawValue : null,
    pvMove: pvMatch ? pvMatch[1] : null,
    isBound,
  };
}

function pickSubMasterMultiPvMove(
  candidates: MultiPvCandidate[],
  difficulty: 'beginner' | 'casual',
  fallbackBestMove: string | null
): string | null {
  if (candidates.length === 0) return fallbackBestMove;
  const sorted = [...candidates].sort((a, b) => b.sideScoreCp - a.sideScoreCp);
  const best = sorted[0];

  if (difficulty === 'casual') {
    if (best.mateFromSide === 1 && Math.random() < 0.9) {
      return best.moveUci;
    }
    const nonBlunder = sorted.filter((c) => c.sideScoreCp >= best.sideScoreCp - 115);
    const pool = (nonBlunder.length > 0 ? nonBlunder : sorted).slice(0, 4);
    const weights = [0.58, 0.24, 0.12, 0.06];
    let total = 0;
    for (let i = 0; i < pool.length; i++) total += weights[i] ?? 0.05;
    let roll = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
      roll -= weights[i] ?? 0.05;
      if (roll <= 0) return pool[i].moveUci;
    }
    return pool[0].moveUci;
  }

  // Beginner (~600-700 Elo): avoids immediate self-mate when safer moves exist,
  // mixes solid moves with human-like tactical oversights across MultiPV candidates.
  const nonInstantMate = sorted.filter((c) => c.mateFromSide !== -1);
  const safePool = nonInstantMate.length > 0 ? nonInstantMate : sorted;
  const withinRange = safePool.filter((c) => c.sideScoreCp >= best.sideScoreCp - 520);
  const pool = (withinRange.length > 0 ? withinRange : safePool).slice(0, 6);
  const weights = [0.22, 0.26, 0.24, 0.15, 0.08, 0.05];
  let total = 0;
  for (let i = 0; i < pool.length; i++) total += weights[i] ?? 0.04;
  let roll = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i] ?? 0.04;
    if (roll <= 0) return pool[i].moveUci;
  }
  return pool[0].moveUci;
}

class StockfishService {
  private worker: Worker | null = null;
  private readyPromise: Promise<boolean> | null = null;
  private isReady = false;
  private disabled = false;
  private initFailures = 0;
  private retryAfterMs = 0;
  private epoch = 0;

  private initTimer: ReturnType<typeof setTimeout> | null = null;
  private initResolve: ((ok: boolean) => void) | null = null;
  private initGeneration = 0;

  private initWaiters: {
    onUciOk?: () => void;
    onReadyOk?: () => void;
  } = {};

  private activeJob: QueuedSearchJob | null = null;
  private queue: QueuedSearchJob[] = [];

  public isReadyNow(): boolean {
    return Boolean(this.isReady && this.worker && !this.disabled);
  }

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
    if (this.retryAfterMs > Date.now()) {
      return Promise.resolve(false);
    }

    const gen = ++this.initGeneration;
    const recordInitFailure = () => {
      this.initFailures += 1;
      if (this.initFailures >= 3) {
        this.disabled = true;
      } else {
        this.retryAfterMs = Date.now() + 3000;
      }
    };

    this.readyPromise = new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        if (this.initTimer) {
          clearTimeout(this.initTimer);
          this.initTimer = null;
        }
        if (this.initResolve === finish) {
          this.initResolve = null;
        }
        if (!ok && gen === this.initGeneration) {
          this.readyPromise = null;
        }
        resolve(ok);
      };

      this.initResolve = finish;
      this.initTimer = setTimeout(() => {
        if (gen !== this.initGeneration) return;
        console.warn('Stockfish WASM init timed out; falling back to local chess eval.');
        recordInitFailure();
        this.cleanupWorker();
        finish(false);
      }, 15000);

      try {
        const worker = new Worker(STOCKFISH_WORKER_URL);
        this.worker = worker;

        worker.onmessage = (event: MessageEvent) => {
          if (gen !== this.initGeneration) return;
          const text = typeof event.data === 'string' ? event.data : String(event.data ?? '');
          const lines = text.split(/\r?\n/);
          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (line) this.handleWorkerLine(line);
          }
        };

        worker.onerror = (err) => {
          if (gen !== this.initGeneration) return;
          console.warn('Stockfish worker error; using local fallback:', err);
          recordInitFailure();
          this.cleanupWorker();
          finish(false);
        };

        this.initWaiters.onUciOk = () => {
          if (gen !== this.initGeneration) return;
          this.post('setoption name Hash value 16');
          this.post('isready');
        };

        this.initWaiters.onReadyOk = () => {
          if (gen !== this.initGeneration) return;
          this.initFailures = 0;
          this.retryAfterMs = 0;
          this.isReady = true;
          finish(true);
        };

        this.post('uci');
      } catch (err) {
        if (gen !== this.initGeneration) return;
        console.warn('Could not start Stockfish worker:', err);
        recordInitFailure();
        this.cleanupWorker();
        finish(false);
      }
    });

    return this.readyPromise;
  }

  private cleanupWorker() {
    this.initWaiters.onUciOk = undefined;
    this.initWaiters.onReadyOk = undefined;
    if (this.initTimer) {
      clearTimeout(this.initTimer);
      this.initTimer = null;
    }
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
      if (job && !job.cancelled) {
        job.cancelled = true;
        job.resolve(null);
      }
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
    this.readyPromise = null;
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
      if (parsed) {
        if (parsed.pvMove && (!parsed.isBound || !job.multiPvMap.has(parsed.pvIndex))) {
          const existing = job.multiPvMap.get(parsed.pvIndex);
          const nextDepth = parsed.depth ?? 0;
          if (!existing || !parsed.isBound || nextDepth >= existing.depth) {
            job.multiPvMap.set(parsed.pvIndex, {
              pvIndex: parsed.pvIndex,
              moveUci: parsed.pvMove,
              sideScoreCp: parsed.sideScoreCp,
              mateFromSide: parsed.mateFromSide,
              depth: nextDepth,
            });
          }
        }
        if (parsed.pvIndex === 1 && (!parsed.isBound || !job.latestScore.hasScore)) {
          if (typeof parsed.whiteCp === 'number') {
            job.latestScore.whiteCp = parsed.whiteCp;
            job.latestScore.hasScore = true;
          }
          if (parsed.mateIn !== undefined) {
            job.latestScore.mateIn = parsed.mateIn;
            job.latestScore.hasScore = true;
          }
          if (typeof parsed.depth === 'number') {
            job.latestScore.depth = parsed.depth;
          }
          if (parsed.pvMove) {
            job.latestScore.pvMove = parsed.pvMove;
          }
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
      const multiPvCandidates = Array.from(job.multiPvMap.values()).sort(
        (a, b) => a.pvIndex - b.pvIndex
      );
      const result: SearchOutcome = {
        evalState: {
          whiteCp: job.latestScore.whiteCp,
          mateIn: job.latestScore.mateIn,
          bestMoveUci,
          depth: job.latestScore.depth,
        },
        bestMoveUci,
        multiPvCandidates,
        hasEvalScore: job.latestScore.hasScore,
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
    if (!ok || jobEpoch !== this.epoch || !this.isReady || !this.worker) {
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
        latestScore: { whiteCp: 0, mateIn: null, hasScore: false },
        multiPvMap: new Map(),
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
      }, 300);
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
        'setoption name MultiPV value 1',
        'setoption name UCI_LimitStrength value false',
        `position fen ${fen}`,
        `go movetime ${Math.max(40, Math.round(movetimeMs))}`,
      ],
      Math.max(2000, movetimeMs + 1600)
    );
    return outcome?.hasEvalScore ? outcome.evalState : null;
  }

  public async getHintMove(fen: string, movetimeMs = 240): Promise<StockfishHintResult | null> {
    if (!fen || !this.isSupportedEnvironment()) return null;
    const outcome = await this.enqueueSearch(
      fen,
      [
        'setoption name MultiPV value 1',
        'setoption name UCI_LimitStrength value false',
        `position fen ${fen}`,
        `go movetime ${Math.max(80, Math.round(movetimeMs))}`,
      ],
      Math.max(2500, movetimeMs + 1800)
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
    const commands =
      profile.mode === 'multipv'
        ? [
            'setoption name UCI_LimitStrength value false',
            `setoption name MultiPV value ${profile.multiPv}`,
            `position fen ${fen}`,
            `go depth ${profile.depth ?? 3}`,
          ]
        : [
            'setoption name MultiPV value 1',
            'setoption name UCI_LimitStrength value true',
            `setoption name UCI_Elo value ${profile.uciElo}`,
            `position fen ${fen}`,
            `go movetime ${profile.movetimeMs}`,
          ];

    const outcome = await this.enqueueSearch(
      fen,
      commands,
      Math.max(2500, profile.movetimeMs + 1800)
    );
    if (!outcome) return null;

    const chosenUci =
      profile.mode === 'multipv' &&
      (profile.difficulty === 'beginner' || profile.difficulty === 'casual')
        ? pickSubMasterMultiPvMove(
            outcome.multiPvCandidates,
            profile.difficulty,
            outcome.bestMoveUci
          )
        : outcome.bestMoveUci;

    if (!chosenUci) return null;
    const parsed = parseUciMove(chosenUci);
    if (!parsed) return null;
    return {
      move: parsed,
      eloLabel: profile.label,
      evalState: outcome.evalState,
    };
  }

  public terminate() {
    this.epoch += 1;
    this.initGeneration += 1;
    this.cleanupWorker();
    if (this.initResolve) {
      const resolvePending = this.initResolve;
      this.initResolve = null;
      resolvePending(false);
    }
    this.readyPromise = null;
    this.disabled = false;
    this.initFailures = 0;
    this.retryAfterMs = 0;
  }
}

export const stockfishService = new StockfishService();
