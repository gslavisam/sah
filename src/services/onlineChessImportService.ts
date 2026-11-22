import { fetchLichessMasterGamePgn } from './lichessExplorerService.ts';

export interface RemoteChessGameSummary {
  id: string;
  source: 'lichess' | 'chesscom';
  whiteName: string;
  whiteRating?: number;
  blackName: string;
  blackRating?: number;
  result: string;
  openingName?: string;
  dateLabel?: string;
  pgn: string;
}

export type ParsedOnlineTarget =
  | { kind: 'lichess-study-chapter'; studyId: string; chapterId: string }
  | { kind: 'lichess-study'; studyId: string }
  | { kind: 'lichess-game'; gameId: string }
  | { kind: 'chesscom-url' }
  | { kind: 'invalid' };

export function parseOnlineChessUrl(rawInput: string): ParsedOnlineTarget {
  const input = rawInput.trim();
  if (!input) return { kind: 'invalid' };

  const studyChapterMatch = input.match(
    /(?:https?:\/\/)?(?:www\.)?lichess\.org\/study\/([a-zA-Z0-9]{8})\/([a-zA-Z0-9]{8})/i
  );
  if (studyChapterMatch) {
    return {
      kind: 'lichess-study-chapter',
      studyId: studyChapterMatch[1],
      chapterId: studyChapterMatch[2],
    };
  }

  const studyMatch = input.match(
    /(?:https?:\/\/)?(?:www\.)?lichess\.org\/study\/([a-zA-Z0-9]{8})/i
  );
  if (studyMatch) {
    return {
      kind: 'lichess-study',
      studyId: studyMatch[1],
    };
  }

  const lichessGameMatch = input.match(
    /(?:https?:\/\/)?(?:www\.)?lichess\.org\/([a-zA-Z0-9]{8,12})(?:[/?#]|$)/i
  );
  if (lichessGameMatch) {
    const candidateId = lichessGameMatch[1];
    if (!['study', 'api', 'training', 'analysis', 'editor'].includes(candidateId.toLowerCase())) {
      return {
        kind: 'lichess-game',
        gameId: candidateId.slice(0, 8),
      };
    }
  }

  if (/^[a-zA-Z0-9]{8}$/.test(input)) {
    return { kind: 'lichess-game', gameId: input };
  }

  if (/(?:https?:\/\/)?(?:www\.)?chess\.com\//i.test(input)) {
    return { kind: 'chesscom-url' };
  }

  return { kind: 'invalid' };
}

export async function fetchPgnFromOnlineUrl(
  rawUrl: string,
  options?: {
    signal?: AbortSignal;
    fetchImpl?: typeof fetch;
  }
): Promise<string> {
  const parsed = parseOnlineChessUrl(rawUrl);
  const fetchFn = options?.fetchImpl ?? fetch;

  if (parsed.kind === 'chesscom-url') {
    throw new Error(
      'Za Chess.com unesi korisničko ime igrača ispod (npr. Hikaru) kako bismo preuzeli njegove partije sa Chess.com API-ja.'
    );
  }
  if (parsed.kind === 'invalid') {
    throw new Error(
      'Unesi važeći Lichess link partije ili studije (npr. https://lichess.org/30WVeXdd).'
    );
  }

  if (parsed.kind === 'lichess-study-chapter') {
    const res = await fetchFn(
      `https://lichess.org/api/study/${encodeURIComponent(parsed.studyId)}/${encodeURIComponent(parsed.chapterId)}.pgn`,
      { signal: options?.signal }
    );
    if (!res.ok) {
      throw new Error('Poglavlje Lichess studije nije dostupno (možda je privatno).');
    }
    const text = (await res.text()).trim();
    if (!text) throw new Error('Izabrana Lichess studija ne sadrži PGN poteze.');
    return text;
  }

  if (parsed.kind === 'lichess-study') {
    const res = await fetchFn(
      `https://lichess.org/api/study/${encodeURIComponent(parsed.studyId)}.pgn`,
      { signal: options?.signal }
    );
    if (!res.ok) {
      throw new Error('Lichess studija nije dostupna (proveri da li je javna).');
    }
    const text = (await res.text()).trim();
    if (!text) throw new Error('Lichess studija ne sadrži nijednu partiju.');
    return text;
  }

  // Lichess regular game export first, then Masters OTB game ID fallback
  const gameRes = await fetchFn(
    `https://lichess.org/game/export/${encodeURIComponent(parsed.gameId)}?clocks=false&evals=true&opening=true`,
    {
      signal: options?.signal,
      headers: {
        Accept: 'application/x-chess-pgn',
      },
    }
  );
  if (gameRes.ok) {
    const text = (await gameRes.text()).trim();
    if (text) return text;
  }

  if (gameRes.status === 404) {
    return fetchLichessMasterGamePgn(parsed.gameId, {
      signal: options?.signal,
      fetchImpl: fetchFn,
    });
  }

  if (gameRes.status === 429) {
    throw new Error('Lichess privremeno ograničava zahteve. Pokušaj ponovo za minut.');
  }

  throw new Error('Nije uspelo preuzimanje partije sa Lichess-a.');
}

interface LichessNdjsonPlayer {
  user?: { name?: string };
  rating?: number;
}

interface LichessNdjsonGame {
  id?: string;
  winner?: 'white' | 'black';
  status?: string;
  createdAt?: number;
  opening?: { name?: string };
  players?: {
    white?: LichessNdjsonPlayer;
    black?: LichessNdjsonPlayer;
  };
  pgn?: string;
}

export async function fetchLichessUserGames(
  username: string,
  options?: {
    max?: number;
    signal?: AbortSignal;
    fetchImpl?: typeof fetch;
  }
): Promise<RemoteChessGameSummary[]> {
  const cleanUser = username.trim().replace(/^@/, '');
  if (!cleanUser || !/^[a-zA-Z0-9_-]{2,40}$/.test(cleanUser)) {
    throw new Error('Unesi ispravno Lichess korisničko ime.');
  }

  const max = Math.max(1, Math.min(12, options?.max ?? 8));
  const fetchFn = options?.fetchImpl ?? fetch;
  const url = `https://lichess.org/api/games/user/${encodeURIComponent(cleanUser)}?max=${max}&pgnInJson=true&clocks=false&evals=false&opening=true`;

  const res = await fetchFn(url, {
    method: 'GET',
    signal: options?.signal,
    headers: {
      Accept: 'application/x-ndjson',
    },
  });

  if (res.status === 404) {
    throw new Error(`Korisnik „${cleanUser}“ nije pronađen na Lichess-u.`);
  }
  if (res.status === 429) {
    throw new Error('Lichess privremeno ograničava zahteve. Pokušaj ponovo za minut.');
  }
  if (!res.ok) {
    throw new Error('Nije uspelo preuzimanje partija sa Lichess-a.');
  }

  const rawText = await res.text();
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const games: RemoteChessGameSummary[] = [];
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as LichessNdjsonGame;
      if (!parsed.pgn || !parsed.id) continue;
      const result =
        parsed.winner === 'white'
          ? '1-0'
          : parsed.winner === 'black'
            ? '0-1'
            : parsed.status === 'draw' || parsed.status === 'stalemate'
              ? '1/2-1/2'
              : '*';
      games.push({
        id: parsed.id,
        source: 'lichess',
        whiteName: parsed.players?.white?.user?.name || 'Beli',
        whiteRating: parsed.players?.white?.rating,
        blackName: parsed.players?.black?.user?.name || 'Crni',
        blackRating: parsed.players?.black?.rating,
        result,
        openingName: parsed.opening?.name,
        dateLabel: parsed.createdAt
          ? new Date(parsed.createdAt).toLocaleDateString('sr-RS')
          : undefined,
        pgn: parsed.pgn,
      });
    } catch {
      // Skip malformed NDJSON line
    }
  }

  if (games.length === 0) {
    throw new Error(`Igrač „${cleanUser}“ nema javnih standardnih partija na Lichess-u.`);
  }
  return games;
}

interface ChessComGameEntry {
  url?: string;
  pgn?: string;
  end_time?: number;
  rules?: string;
  white?: { username?: string; rating?: number; result?: string };
  black?: { username?: string; rating?: number; result?: string };
}

function resolveChessComResult(game: ChessComGameEntry): string {
  if (game.white?.result === 'win') return '1-0';
  if (game.black?.result === 'win') return '0-1';
  const match = game.pgn?.match(/\[Result\s+"([^"]+)"\]/);
  if (match?.[1]) return match[1];
  return '1/2-1/2';
}

export async function fetchChessComUserGames(
  username: string,
  options?: {
    max?: number;
    signal?: AbortSignal;
    fetchImpl?: typeof fetch;
  }
): Promise<RemoteChessGameSummary[]> {
  const cleanUser = username.trim().replace(/^@/, '').toLowerCase();
  if (!cleanUser || !/^[a-z0-9_-]{2,40}$/.test(cleanUser)) {
    throw new Error('Unesi ispravno Chess.com korisničko ime.');
  }

  const max = Math.max(1, Math.min(12, options?.max ?? 8));
  const fetchFn = options?.fetchImpl ?? fetch;
  const archivesRes = await fetchFn(
    `https://api.chess.com/pub/player/${encodeURIComponent(cleanUser)}/games/archives`,
    {
      method: 'GET',
      signal: options?.signal,
      headers: { Accept: 'application/json' },
    }
  );

  if (archivesRes.status === 404) {
    throw new Error(`Korisnik „${cleanUser}“ nije pronađen na Chess.com.`);
  }
  if (archivesRes.status === 429) {
    throw new Error('Chess.com privremeno ograničava zahteve. Pokušaj ponovo za minut.');
  }
  if (!archivesRes.ok) {
    throw new Error('Nije uspelo preuzimanje arhive sa Chess.com.');
  }

  const archivesData = (await archivesRes.json()) as { archives?: string[] };
  const archives = Array.isArray(archivesData.archives) ? archivesData.archives : [];
  if (archives.length === 0) {
    throw new Error(`Igrač „${cleanUser}“ nema odigranih partija na Chess.com.`);
  }

  const collected: RemoteChessGameSummary[] = [];
  const urlsToCheck = archives.slice(-2).reverse();

  for (const monthUrl of urlsToCheck) {
    if (collected.length >= max) break;
    const monthRes = await fetchFn(monthUrl, {
      method: 'GET',
      signal: options?.signal,
      headers: { Accept: 'application/json' },
    });
    if (!monthRes.ok) continue;

    const monthData = (await monthRes.json()) as { games?: ChessComGameEntry[] };
    const monthGames = Array.isArray(monthData.games) ? monthData.games.slice().reverse() : [];

    for (const game of monthGames) {
      if (collected.length >= max) break;
      if (!game.pgn || (game.rules && game.rules !== 'chess')) continue;

      const ecoMatch = game.pgn.match(/\[ECOUrl\s+"https?:\/\/[^"]*\/openings\/([^"]+)"\]/);
      const openingName = ecoMatch?.[1]
        ? ecoMatch[1].replace(/-/g, ' ').slice(0, 48)
        : undefined;

      collected.push({
        id: game.url || `chesscom-${collected.length}-${game.end_time || 0}`,
        source: 'chesscom',
        whiteName: game.white?.username || 'Beli',
        whiteRating: game.white?.rating,
        blackName: game.black?.username || 'Crni',
        blackRating: game.black?.rating,
        result: resolveChessComResult(game),
        openingName,
        dateLabel: game.end_time
          ? new Date(game.end_time * 1000).toLocaleDateString('sr-RS')
          : undefined,
        pgn: game.pgn,
      });
    }
  }

  if (collected.length === 0) {
    throw new Error(`Igrač „${cleanUser}“ nema standardnih partija sa PGN zapisom.`);
  }
  return collected;
}
