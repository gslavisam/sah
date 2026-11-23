import type { ChessAcademyLesson, GameEducationalBrief } from '../data/chessAcademyLessons.ts';
import { geminiService } from './geminiService.ts';

export const GAME_BRIEF_CACHE_KEY = 'wizard_academy_game_briefs_v1';
export const GAME_BRIEF_AUTO_OPEN_KEY = 'wizard_academy_brief_auto_open_v1';
const MAX_CACHED_BRIEFS = 60;

export interface LichessOpeningHint {
  eco?: string;
  name?: string;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface GetOrCreateBriefOptions {
  lichessOpening?: LichessOpeningHint | null;
  storage?: StorageLike;
  checkGeminiConfigured?: () => Promise<boolean>;
  generateGeminiJson?: (prompt: string) => Promise<string | null>;
}

const memoryBriefCache = new Map<string, GameEducationalBrief>();

function resolveStorage(customStorage?: StorageLike): StorageLike | null {
  if (customStorage) return customStorage;
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    // Ignore restricted storage contexts
  }
  return null;
}

function fnv1aHash(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function getLessonBriefCacheKey(lesson: ChessAcademyLesson): string {
  if (!lesson.isCustom) {
    return `builtin:${lesson.id}`;
  }
  const fingerprint = JSON.stringify({
    white: lesson.gameInfo?.white || '',
    black: lesson.gameInfo?.black || '',
    date: lesson.gameInfo?.date || '',
    fen: lesson.initialFen || '',
    moves: lesson.steps.map((s) => `${s.from}-${s.to}${s.promotion ? `=${s.promotion}` : ''}`),
  });
  return `pgn:${fnv1aHash(fingerprint)}`;
}

function readPersistedCacheMap(storage: StorageLike | null): Record<string, GameEducationalBrief> {
  if (!storage) return {};
  try {
    const raw = storage.getItem(GAME_BRIEF_CACHE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Record<string, GameEducationalBrief>;
  } catch {
    return {};
  }
}

function isValidBrief(candidate: unknown): candidate is GameEducationalBrief {
  if (!candidate || typeof candidate !== 'object') return false;
  const record = candidate as Record<string, unknown>;
  return (
    typeof record.title === 'string' &&
    typeof record.playersLine === 'string' &&
    typeof record.contextLine === 'string' &&
    typeof record.openingLine === 'string' &&
    typeof record.strategySummary === 'string' &&
    Array.isArray(record.keyMoments) &&
    (record.source === 'gemini' || record.source === 'local')
  );
}

export function getCachedGameBrief(
  lesson: ChessAcademyLesson,
  customStorage?: StorageLike
): GameEducationalBrief | null {
  const key = getLessonBriefCacheKey(lesson);
  const inMem = memoryBriefCache.get(key);
  if (inMem) return inMem;

  if (lesson.gameInfo?.cachedBrief && isValidBrief(lesson.gameInfo.cachedBrief)) {
    memoryBriefCache.set(key, lesson.gameInfo.cachedBrief);
    return lesson.gameInfo.cachedBrief;
  }

  const storage = resolveStorage(customStorage);
  const map = readPersistedCacheMap(storage);
  const stored = map[key];
  if (isValidBrief(stored)) {
    memoryBriefCache.set(key, stored);
    return stored;
  }
  return null;
}

export function saveCachedGameBrief(
  lesson: ChessAcademyLesson,
  brief: GameEducationalBrief,
  customStorage?: StorageLike
): void {
  const key = getLessonBriefCacheKey(lesson);
  memoryBriefCache.set(key, brief);

  const storage = resolveStorage(customStorage);
  if (!storage) return;

  try {
    const map = readPersistedCacheMap(storage);
    map[key] = brief;
    const entries = Object.entries(map)
      .filter(([, item]) => isValidBrief(item))
      .sort((a, b) => (b[1].generatedAt || 0) - (a[1].generatedAt || 0))
      .slice(0, MAX_CACHED_BRIEFS);
    storage.setItem(GAME_BRIEF_CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Ignore storage quota errors
  }
}

function extractSan(moveNumber: string): string {
  const parts = moveNumber.trim().split(/\s+/);
  return parts[parts.length - 1] || moveNumber;
}

function detectOpeningFromSteps(lesson: ChessAcademyLesson): string {
  if (lesson.initialFen) {
    return 'Pozicija iz središnjice ili završnice (prilagođeni početni FEN)';
  }
  const sans = lesson.steps.slice(0, 8).map((s) => extractSan(s.moveNumber));
  const seq = sans.join(' ');
  if (seq.startsWith('e4 e5 Nf3 Nc6 Bb5')) return 'Španska partija (Ruy Lopez)';
  if (seq.startsWith('e4 e5 Nf3 Nc6 Bc4')) return 'Italijanska partija';
  if (seq.startsWith('e4 e5 Nf3 Nc6 d4')) return 'Škotska partija';
  if (seq.startsWith('e4 e5 Nf3 Nf6')) return 'Petrov (Ruska odbrana)';
  if (seq.startsWith('e4 e5 f4')) return 'Kraljev gambit';
  if (seq.startsWith('e4 e5 Nc3')) return 'Bečka partija';
  if (seq.startsWith('e4 c5')) return 'Sicilijanska odbrana';
  if (seq.startsWith('e4 e6')) return 'Francuska odbrana';
  if (seq.startsWith('e4 c6')) return 'Karo-Kan odbrana';
  if (seq.startsWith('e4 d5')) return 'Skandinavska odbrana';
  if (seq.startsWith('e4 Nf6')) return 'Aljehinova odbrana';
  if (seq.startsWith('e4 d6')) return 'Pircova odbrana';
  if (seq.startsWith('d4 d5 c4 c6')) return 'Slovenska odbrana';
  if (seq.startsWith('d4 d5 c4 e6')) return 'Odbijeni damin gambit';
  if (seq.startsWith('d4 d5 c4 dxc4')) return 'Prihvaćeni damin gambit';
  if (seq.startsWith('d4 d5 c4')) return 'Damin gambit';
  if (seq.startsWith('d4 Nf6 c4 g6')) return 'Kraljeva indijska odbrana';
  if (seq.startsWith('d4 Nf6 c4 e6 Nc3 Bb4')) return 'Nimco-indijska odbrana';
  if (seq.startsWith('d4 Nf6 c4')) return 'Indijska odbrana';
  if (seq.startsWith('d4 d5 Bf4') || seq.startsWith('d4 Nf6 Bf4')) return 'Londonski sistem';
  if (seq.startsWith('c4')) return 'Englesko otvaranje';
  if (seq.startsWith('Nf3')) return 'Retijevo otvaranje';
  return '';
}

function formatPlayersLine(lesson: ChessAcademyLesson): string {
  const info = lesson.gameInfo;
  if (info?.white || info?.black) {
    const w = info.white || 'Beli';
    const b = info.black || 'Crni';
    const wLabel = info.whiteElo ? `${w} (${info.whiteElo})` : w;
    const bLabel = info.blackElo ? `${b} (${info.blackElo})` : b;
    return `${wLabel} – ${bLabel}`;
  }
  return lesson.isCustom ? lesson.name : `${lesson.name} · ${lesson.category}`;
}

export function buildLocalGameBrief(
  lesson: ChessAcademyLesson,
  lichessOpening?: LichessOpeningHint | null
): GameEducationalBrief {
  const info = lesson.gameInfo;
  const playersLine = formatPlayersLine(lesson);

  const contextParts: string[] = [];
  if (info?.event) contextParts.push(info.event);
  if (info?.site) contextParts.push(info.site);
  if (info?.date) contextParts.push(info.date);
  if (info?.result) contextParts.push(`Rezultat: ${info.result}`);
  contextParts.push(`${lesson.steps.length} poteza`);
  const contextLine = lesson.isCustom
    ? contextParts.join(' · ')
    : `${lesson.summary} (${lesson.difficulty} · ${lesson.steps.length} poteza)`;

  const ecoCode = info?.eco || lichessOpening?.eco || (!lesson.isCustom && lesson.badge !== 'PGN' ? lesson.badge : '');
  const detectedName = info?.opening || lichessOpening?.name || detectOpeningFromSteps(lesson);
  const openingTitle = [ecoCode, detectedName].filter(Boolean).join(' · ');
  const openingLine = openingTitle
    ? `${openingTitle}. Obrati pažnju na raspored figura u prvim potezima, borbu za centralna polja (e4, d4, e5, d5) i brzinu razvoja lakih figura pre nego što počne direktan napad.`
    : 'Igrači brzo ulaze u borbu za centar i prostor; prati koordinaciju skakača i lovaca u prvoj fazi partije.';

  let whiteCastle: 'O-O' | 'O-O-O' | null = null;
  let blackCastle: 'O-O' | 'O-O-O' | null = null;
  let captures = 0;
  let checks = 0;
  let promotions = 0;
  let hasCheckmate = false;
  let queenTradeMove: string | null = null;
  let firstCheckMove: string | null = null;
  let promotionMove: string | null = null;
  let whiteCastleMove: string | null = null;
  let blackCastleMove: string | null = null;

  for (const step of lesson.steps) {
    const san = extractSan(step.moveNumber);
    const isWhite = !step.moveNumber.includes('...');
    if (san.startsWith('O-O-O')) {
      if (isWhite && !whiteCastle) {
        whiteCastle = 'O-O-O';
        whiteCastleMove = step.moveNumber;
      } else if (!isWhite && !blackCastle) {
        blackCastle = 'O-O-O';
        blackCastleMove = step.moveNumber;
      }
    } else if (san.startsWith('O-O')) {
      if (isWhite && !whiteCastle) {
        whiteCastle = 'O-O';
        whiteCastleMove = step.moveNumber;
      } else if (!isWhite && !blackCastle) {
        blackCastle = 'O-O';
        blackCastleMove = step.moveNumber;
      }
    }
    if (san.includes('x')) {
      captures += 1;
      if (san.startsWith('Q') && !queenTradeMove) {
        queenTradeMove = step.moveNumber;
      }
    }
    if (san.includes('+')) {
      checks += 1;
      if (!firstCheckMove) firstCheckMove = step.moveNumber;
    }
    if (san.includes('=')) {
      promotions += 1;
      if (!promotionMove) promotionMove = step.moveNumber;
    }
    if (san.includes('#')) {
      hasCheckmate = true;
    }
  }

  const strategyNotes: string[] = [];
  if (whiteCastle && blackCastle) {
    if (whiteCastle !== blackCastle) {
      strategyNotes.push(
        'Kraljevi su rokirani na suprotne strane table, što donosi oštru trku u pešačkim jurišima na oba krila.'
      );
    } else {
      strategyNotes.push(
        'Obe strane su sklonile kraljeve na istu stranu, pa se igra lomi kroz strpljivo manevrisanje, osvajanje prostora i pripremu proboja.'
      );
    }
  } else if (whiteCastle || blackCastle) {
    strategyNotes.push(
      'Jedan kralj je ostao duže u centru dok je protivnik završio rokadu, što otvara prilike za taktičke udare po centralnim linijama.'
    );
  } else {
    strategyNotes.push(
      'Partija ostaje dinamična u centru bez obostrane rokade, sa brzim taktičkim zapletima od samog starta.'
    );
  }

  if (promotions > 0) {
    strategyNotes.push(
      `Partija prelazi u napetu završnicu u kojoj je pešak uspeo da stigne do promocije (${promotions}×).`
    );
  } else if (hasCheckmate) {
    strategyNotes.push(
      `Uz ${captures} razmena i ${checks} šahova, napadačka strana pronalazi direktan put do matne mreže.`
    );
  } else {
    strategyNotes.push(
      `Kroz ${captures} uzimanja i ${checks} šahova vidi se kako se inicijativa i kontrola otvorenih linija pretvaraju u prednost.`
    );
  }

  const keyMoments: string[] = [];
  if (whiteCastleMove || blackCastleMove) {
    const castlePair = [whiteCastleMove, blackCastleMove].filter(Boolean).join(' / ');
    keyMoments.push(`${castlePair} — Osiguravanje kralja i povezivanje topova za središnjicu.`);
  }
  if (queenTradeMove) {
    keyMoments.push(`${queenTradeMove} — Aktiviranje dame i taktički pritisak kroz uzimanje.`);
  }
  if (firstCheckMove) {
    keyMoments.push(`${firstCheckMove} — Prvi direktan šah koji remeti koordinaciju protivničkih figura.`);
  }
  if (promotionMove) {
    keyMoments.push(`${promotionMove} — Odlučujuća promocija slobodnog pešaka u završnici.`);
  }
  const lastStep = lesson.steps[lesson.steps.length - 1];
  if (lastStep) {
    keyMoments.push(
      hasCheckmate
        ? `${lastStep.moveNumber} — Završni matni udarac kojim je partija rešena.`
        : `${lastStep.moveNumber} — Završna tačka zabeleženog toka partije.`
    );
  }

  return {
    title: lesson.name,
    playersLine,
    contextLine,
    openingLine,
    strategySummary: strategyNotes.join(' '),
    keyMoments: keyMoments.slice(0, 4),
    source: 'local',
    generatedAt: Date.now(),
  };
}

function buildGeminiBriefPrompt(
  lesson: ChessAcademyLesson,
  localFallback: GameEducationalBrief
): string {
  const info = lesson.gameInfo;
  const movesText = lesson.steps
    .slice(0, 120)
    .map((s) => s.moveNumber)
    .join(' ');
  const metaLines = [
    `Naziv: ${lesson.name}`,
    `Igrači: ${localFallback.playersLine}`,
    info?.event ? `Događaj: ${info.event}` : '',
    info?.site ? `Mesto: ${info.site}` : '',
    info?.date ? `Datum: ${info.date}` : '',
    info?.result ? `Rezultat: ${info.result}` : '',
    info?.eco || info?.opening
      ? `Otvaranje: ${[info?.eco, info?.opening].filter(Boolean).join(' - ')}`
      : '',
    lesson.initialFen ? `Početni FEN: ${lesson.initialFen}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return `Ti si šahovski trener i istoričar šaha. Napiši jasan, edukativan pregled partije na srpskom jeziku (ekavica, latinica) za igrača koji se sprema da je pogleda na 3D tabli.

Podaci o partiji:
${metaLines}

Potezi (do prvih 120):
${movesText}

Vrati ISKLJUČIVO validan JSON objekat sa tačno ovim ključevima:
{
  "contextLine": "Ko je igrao, gde i kada (ako su poznati istorijski igrači ili turnir, ukratko opiši značaj u 1-2 rečenice).",
  "openingLine": "Koje otvaranje ili odbrana je igrano (naziv + ECO ako je poznat) i koja je osnovna strateška ideja za obe strane (1-2 rečenice).",
  "strategySummary": "Po čemu je partija karakteristična, koji su glavni planovi u središnjici/završnici i koja je glavna šahovska pouka (2-3 rečenice).",
  "keyMoments": [
    "Broj poteza (npr. 12. Bxh7+) — kratko objašnjenje zašto je taj trenutak važan",
    "Još 1-2 karakteristična poteza iz same partije"
  ]
}

Pravila:
- Budi konkretan i tačan prema datim potezima; nemoj izmišljati poteze koji nisu u listi.
- Neka objašnjenja budu zanimljiva i razumljiva učeniku šaha.`;
}

function parseGeminiBriefJson(
  rawText: string,
  fallback: GameEducationalBrief
): GameEducationalBrief | null {
  try {
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const contextLine =
      typeof parsed.contextLine === 'string' && parsed.contextLine.trim()
        ? parsed.contextLine.trim()
        : fallback.contextLine;
    const openingLine =
      typeof parsed.openingLine === 'string' && parsed.openingLine.trim()
        ? parsed.openingLine.trim()
        : fallback.openingLine;
    const strategySummary =
      typeof parsed.strategySummary === 'string' && parsed.strategySummary.trim()
        ? parsed.strategySummary.trim()
        : fallback.strategySummary;
    const keyMoments = Array.isArray(parsed.keyMoments)
      ? parsed.keyMoments
          .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          .slice(0, 4)
      : fallback.keyMoments;

    return {
      title: fallback.title,
      playersLine: fallback.playersLine,
      contextLine,
      openingLine,
      strategySummary,
      keyMoments: keyMoments.length > 0 ? keyMoments : fallback.keyMoments,
      source: 'gemini',
      generatedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

export async function getOrCreateGameBrief(
  lesson: ChessAcademyLesson,
  options?: GetOrCreateBriefOptions
): Promise<{ brief: GameEducationalBrief; fromCache: boolean }> {
  const storage = resolveStorage(options?.storage);
  const cached = getCachedGameBrief(lesson, storage ?? undefined);

  if (cached && cached.source === 'gemini') {
    return { brief: cached, fromCache: true };
  }

  const checkConfigured =
    options?.checkGeminiConfigured ?? (() => geminiService.checkServerStatus());
  const generateJson =
    options?.generateGeminiJson ?? ((prompt: string) => geminiService.generateGameOverviewJson(prompt));

  const geminiConfigured = await checkConfigured().catch(() => false);
  if (!geminiConfigured) {
    if (cached) {
      return { brief: cached, fromCache: true };
    }
    const localBrief = buildLocalGameBrief(lesson, options?.lichessOpening);
    saveCachedGameBrief(lesson, localBrief, storage ?? undefined);
    return { brief: localBrief, fromCache: false };
  }

  const localFallback = cached ?? buildLocalGameBrief(lesson, options?.lichessOpening);
  const prompt = buildGeminiBriefPrompt(lesson, localFallback);
  const rawAi = await generateJson(prompt).catch(() => null);
  if (rawAi) {
    const parsed = parseGeminiBriefJson(rawAi, localFallback);
    if (parsed) {
      saveCachedGameBrief(lesson, parsed, storage ?? undefined);
      return { brief: parsed, fromCache: false };
    }
  }

  saveCachedGameBrief(lesson, localFallback, storage ?? undefined);
  return { brief: localFallback, fromCache: false };
}

export function getAutoOpenBriefPreference(customStorage?: StorageLike): boolean {
  const storage = resolveStorage(customStorage);
  if (!storage) return true;
  try {
    return storage.getItem(GAME_BRIEF_AUTO_OPEN_KEY) !== '0';
  } catch {
    return true;
  }
}

export function setAutoOpenBriefPreference(
  enabled: boolean,
  customStorage?: StorageLike
): void {
  const storage = resolveStorage(customStorage);
  if (!storage) return;
  try {
    storage.setItem(GAME_BRIEF_AUTO_OPEN_KEY, enabled ? '1' : '0');
  } catch {
    // Ignore storage errors
  }
}

export function __resetGameBriefCacheForTests(): void {
  memoryBriefCache.clear();
}
