import type { MoveQuality } from '../shared/chessRules';

export type PersonaId = 'mentor' | 'roast' | 'rival';

export interface Persona {
  id: PersonaId;
  name: string;
  title: string;
  avatar: string;
  badge: string;
  description: string;
  systemPrompt: string;
}

export const PERSONAS: Record<PersonaId, Persona> = {
  mentor: {
    id: 'mentor',
    name: 'Alistair',
    title: 'Mudri Arhimag',
    avatar: '🧙‍♂️',
    badge: 'Podrška & Učenje',
    description: 'Prijateljski mentor koji objašnjava osnove šaha i strategiju bez stresa.',
    systemPrompt: `Ti si mudri arhimag Alistair, mentor šaha u magijskoj katedrali. Tvoj učenik je tinejdžer i početnik.
Govori toplo, ohrabrujuće, ali poučno i jednostavno (na srpskom jeziku).
Pravila:
- NIKADA nemoj koristiti suvoparnu algebarsku notaciju poput '1. e4 e5' ili '+1.8 prednost'.
- Objašnjavaj jezikom običnog igrača (npr. 'Odlično, osvojio si centar!', 'Pazi, ostavio si konja bez odbrane!').
- Tvoj odgovor MORA biti kratak: najviše 1 do 2 rečenice.
- Koristi magijski i viteški šarm (katedrale, čini, magija).`,
  },
  roast: {
    id: 'roast',
    name: 'Grix',
    title: 'Goblin Roastmaster',
    avatar: '😈',
    badge: 'Mimovi & Prozivke',
    description: 'Sarkastični goblin koji nemilosrdno i duhovito roasta svaki loš potez.',
    systemPrompt: `Ti si Grix, cinični goblin roastmaster i šahovski trol.
Komentarišeš partiju tinejdžera na izuzetno duhovit, sarkastičan način pun modernog gejmerskog slenga (npr. 'blunder', 'skill issue', 'donacija veka', 'čist larping', 'GG', 'brat misli da je Magnus').
Pravila:
- Odgovaraj na srpskom jeziku sa tinejdžerskim/gejmerskim žargonom.
- Budi smešan i zajedljiv, ali bez pravih uvreda (isključivo benigni gaming banter).
- Tvoj odgovor MORA biti kratak: tačno 1 do 2 rečenice.`,
  },
  rival: {
    id: 'rival',
    name: 'Valerius',
    title: 'Gordi Vitez',
    avatar: '⚔️',
    badge: 'Dramatični Rival',
    description: 'Oholi viteški šampion koji dramatično izaziva svaki tvoj potez.',
    systemPrompt: `Ti si ser Valerius, oholi i dramatični vitez katedrale koji smatra sebe nepobedivim šampionom.
Pravila:
- Govori teatralno, gordo i samouvereno na srpskom jeziku (npr. 'Hrabar pokušaj, šegrte, ali moj bedem je nesalomiv!').
- Izazivaj igrača i slavi svoje poteze, a kada igrač odigra dobar potez, pravi se da je to bila samo puka sreća.
- Tvoj odgovor MORA biti kratak: tačno 1 do 2 rečenice.`,
  },
};

export interface MoveEventDetail {
  move: {
    color: 'w' | 'b';
    pieceType: string;
    fromSquare?: string;
    toSquare?: string;
    capture?: boolean;
    enPassant?: boolean;
    castle?: 'k' | 'q';
    promotion?: string;
  } | null;
  currentTurn: 'w' | 'b';
  gameOver: boolean;
  isCheckmate?: boolean;
  drawReason?: 'stalemate' | 'fifty-move' | 'repetition' | null;
  inCheck: boolean;
  moveCount: number;
  playerColor: 'w' | 'b';
  fen?: string;
  moveQuality?: MoveQuality;
  cpLoss?: number;
  evalLabel?: string;
}

export interface StockfishHintContext {
  fromSquare: string;
  toSquare: string;
  pieceType?: string;
  promotion?: string;
  evalLabel?: string;
}

export interface BoardFromImageRequest {
  imageBase64: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  turnHint?: 'auto' | 'w' | 'b';
  perspectiveHint?: 'auto' | 'w' | 'b';
}

export interface BoardFromImageResult {
  ok: boolean;
  configured?: boolean;
  fen?: string;
  turn?: 'w' | 'b';
  perspective?: 'w' | 'b';
  confidence?: 'high' | 'medium' | 'low';
  notes?: string;
  rawFen?: string;
  error?: string;
}

const PIECE_NAMES_SR: Record<string, string> = {
  pawn: 'pešaka',
  rook: 'topa',
  knight: 'skakača',
  bishop: 'lovca',
  queen: 'kraljicu',
  king: 'kralja',
};

const PIECE_NOM_SR: Record<string, string> = {
  pawn: 'pešak',
  rook: 'top',
  knight: 'skakač',
  bishop: 'lovac',
  queen: 'kraljica',
  king: 'kralj',
};

// Offline fallback responses for instant responsiveness and when no API key is set
const FALLBACK_REACTIONS: Record<PersonaId, {
  opening: string[];
  capture: string[];
  check: string[];
  aiCheck: string[];
  blunder: string[];
  checkmate: string[];
  aiCheckmate: string[];
  draw: string[];
  general: string[];
}> = {
  mentor: {
    opening: [
      'Dobar početak! Kontrola centralnih polja daje tvojim figurama slobodu kretanja.',
      'Razvijaj lake figure (skakače i lovce) pre nego što kreneš u napad!',
    ],
    capture: [
      'Odličan udarac! Kamena figura je razbijena, ali pazi na uzvratni napad.',
      'Svaka osvojena figura menja ravnotežu na tabli. Nastavi promišljeno.',
    ],
    check: [
      'Šah! Protivnički kralj je u opasnosti, drži pritisak!',
      'Kralj je napadnut! Sada je trenutak da vidiš gde su mu putevi za bekstvo.',
    ],
    aiCheck: [
      'Oprez, šegrte — tvoj kralj je u šahu! Pronađi zaklon, blokiraj napad ili uzmi napadača.',
      'Šah nad tvojim kraljem! Mirno proveri sva sigurna polja za odbranu.',
    ],
    blunder: [
      'Oprez, šegrte! Ova figura je možda ostala nebranjena. Uvek proveri gde protivnik cilja.',
      'Ne brini za grešku — svaki poraz je samo lekcija na putu do velemajstora.',
    ],
    checkmate: [
      'Mat! Maestralna pobeda u sanctumu, dokazao si svoju snagu!',
      'Sanctum se klanja novom šampionu. Odlična partija!',
    ],
    aiCheckmate: [
      'Ne brini za grešku — svaki poraz je samo lekcija na putu do velemajstora.',
      'Protivnik je pronašao mat ovog puta, šegrte. Pokreni novu partiju i primeni naučeno!',
    ],
    draw: [
      'Partija je završena remijem! Ravnoteža snaga u sanctumu ostaje netaknuta.',
      'Častan remi! Nekada je čvrsta odbrana jednako vredna kao i pobeda.',
    ],
    general: [
      'Pogledaj celu tablu pre sledećeg poteza — magija je u strpljenju.',
      'Tvoje pozicije postaju sve čvršće. Samo mirno.',
    ],
  },
  roast: {
    opening: [
      'Brat otvorio sa ovim? Vidim da teorija otvaranja nije bila na meniju danas.',
      'Hrabar potez... ili čist larping, videćemo za dva kruga.',
    ],
    capture: [
      'BAM! Otišla figura u paramparčad! Ovaj udarac je boleo i kroz ekran.',
      'Okej, priznaću ti — fin udarac! Ali nemoj sad odmah da poletiš.',
    ],
    check: [
      'ŠAH! Kralj beži kao da mu gori katedrala pod nogama!',
      'Oho, daješ šah?! Pazi samo da ti se to ne vrati kao bumerang!',
    ],
    aiCheck: [
      'Panika u redovima, gde ćeš sad sa krunom majstore?',
      'ŠAH! Kralj beži kao da mu gori katedrala pod nogama!',
    ],
    blunder: [
      'Donacija uspešno prihvaćena! Hvala lepo, dođite nam opet.',
      'Brate, šta je ovo bilo?! Da li ti igraš šah ili deliš poklone za praznike?',
      'Definicija "skill issue"-a u jednom jedinom kliku. Moj rejting plače.',
    ],
    checkmate: [
      'Nemoguće... dobio si matom?! Sigurno mi je zalagovao mozak, tražim revanš odmah!',
      'GG! Matčina veka! Priznajem, ovog puta si pokidao tablu.',
    ],
    aiCheckmate: [
      'GG! Matčina veka! Vreme je da se ugasi igrica i ode na svež vazduh.',
      'Zatvaraj katedralu, motaj kablove — ovo je bio apsolutni potop!',
    ],
    draw: [
      'Remi?! Toliko muke ni oko čega — bukvalno najdosadniji mogući kraj!',
      'Pat pozicija, majstore! Ni pobeda ni poraz, čist antiklimaks.',
    ],
    general: [
      'Razmišljaš duže nego što meni treba da naučim kvantnu fiziku. Odigraj nešto!',
      'Gledam tablu i ne verujem šta vidim, ali dobro, sloboda izbora...',
    ],
  },
  rival: {
    opening: [
      'Postavljaš svoje pešake? Moj oklop ne probijaju tako jeftine varke!',
      'Kreni napred, izazivaču! Da vidimo od čega si napravljen.',
    ],
    capture: [
      'Jedna figura manje! Ali pravi rat tek počinje, šegrte.',
      'Srećan udarac, izazivaču! Moja garda će ubrzo uzvratiti dvostrukom merom!',
    ],
    check: [
      'Drzak napad na moju krunu! Videćeš kako ser Valerius uzvraća iz opsade!',
      'Samo privremena pretnja, šegrte — moj kralj ne poznaje strah!',
    ],
    aiCheck: [
      'Šah! Klekni pred mojim trupama, tvoj kralj drhti!',
      'Oseti gnev mojih figura — nema tog štita koji te može spasiti!',
    ],
    blunder: [
      'Pala je kamena garda! Moja osveta će biti brza i nemilosrdna.',
      'Hahaha! Kakav naivan potez! Znao sam da nisi dorastao ovom dvoboju.',
      'Tvoja nepažnja je moja najveća gozba. Gledaj kako tvoja odbrana nestaje.',
    ],
    checkmate: [
      'Nemoguće! Moj bedem je pao?! Čestitam, izazivaču... ali tražim novi dvoboj!',
      'Pobedio si u ovoj bici, šegrte, ali ser Valerius se nikada ne predaje zauvek!',
    ],
    aiCheckmate: [
      'Kraj je! Sudbina je zapečaćena, pobeda pripada najdostojnijem!',
      'Tvoj kralj je pao u prašinu. Zauvek zapamti ovu lekciju!',
    ],
    draw: [
      'Nerešeno?! Nijedan vitez danas nije poklekao — moraćemo ponovo da ukrstimo koplja!',
      'Remi u dvorani izazova! Dostojan otpor, ali sledeći put neće biti milosti.',
    ],
    general: [
      'Moje trupe stoje postojano. Tvoji napadi su samo vetar u magli.',
      'Dobar pokušaj, ali daleko si od titule šampiona katedrale.',
    ],
  },
};

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

class GeminiService {
  private serverConfigured: boolean | null = null;

  public async checkServerStatus(): Promise<boolean> {
    if (this.serverConfigured !== null) {
      return this.serverConfigured;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    try {
      const res = await fetch('/api/gemini/status', { signal: controller.signal });
      if (!res.ok) {
        this.serverConfigured = false;
        return false;
      }
      const data = (await res.json()) as { configured?: boolean };
      this.serverConfigured = Boolean(data?.configured);
      return this.serverConfigured;
    } catch {
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async generateViaProxy(
    prompt: string,
    options?: { maxOutputTokens?: number; jsonMode?: boolean; timeoutMs?: number }
  ): Promise<string | null> {
    if (this.serverConfigured === false) {
      return null;
    }
    const controller = new AbortController();
    const timeoutMs = options?.timeoutMs ?? 8500;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          ...(options?.maxOutputTokens ? { maxOutputTokens: options.maxOutputTokens } : {}),
          ...(options?.jsonMode ? { jsonMode: true } : {}),
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        return null;
      }
      const data = (await res.json()) as { text?: string | null; configured?: boolean };
      if (typeof data?.configured === 'boolean') {
        this.serverConfigured = data.configured;
      }
      return data?.text?.trim() || null;
    } catch {
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  public async generateGameOverviewJson(prompt: string): Promise<string | null> {
    const configured = await this.checkServerStatus();
    if (!configured) {
      return null;
    }
    return this.generateViaProxy(prompt, {
      maxOutputTokens: 580,
      jsonMode: true,
      timeoutMs: 11500,
    });
  }

  public async getReaction(
    personaId: PersonaId,
    detail: MoveEventDetail,
    boardDescription?: string
  ): Promise<string> {
    const persona = PERSONAS[personaId] || PERSONAS.mentor;
    const pool = FALLBACK_REACTIONS[personaId] || FALLBACK_REACTIONS.mentor;
    const isPlayerMove = detail.move ? detail.move.color === detail.playerColor : true;
    const isCheckmate = Boolean(detail.isCheckmate ?? (detail.gameOver && detail.inCheck && !detail.drawReason));
    const isDraw = Boolean(detail.gameOver && !isCheckmate);

    let fallback = getRandom(pool.general);
    if (isCheckmate) {
      fallback = getRandom(isPlayerMove ? pool.checkmate : pool.aiCheckmate);
    } else if (isDraw) {
      fallback = getRandom(pool.draw);
    } else if (detail.inCheck) {
      fallback = getRandom(isPlayerMove ? pool.check : pool.aiCheck);
    } else if (isPlayerMove && detail.moveQuality === 'blunder') {
      fallback = getRandom(pool.blunder);
    } else if (detail.move?.capture) {
      fallback = getRandom(isPlayerMove ? pool.capture : pool.blunder);
    } else if (detail.moveCount <= 4) {
      fallback = getRandom(pool.opening);
    }

    const configured = await this.checkServerStatus();
    if (!configured) {
      return fallback;
    }

    try {
      const actorLabel = isPlayerMove ? 'IGRAČ (učenik/izazivač)' : 'AI PROTIVNIK';
      const pieceAcc = detail.move ? PIECE_NAMES_SR[detail.move.pieceType] || detail.move.pieceType : 'figuru';
      const specialTags: string[] = [];
      if (detail.move?.castle) {
        specialTags.push(detail.move.castle === 'k' ? 'izvršio malu rokadu' : 'izvršio veliku rokadu');
      }
      if (detail.move?.enPassant) {
        specialTags.push('uzeo pešaka en passant');
      } else if (detail.move?.capture) {
        specialTags.push('pojeo protivničku figuru');
      }
      if (detail.move?.promotion) {
        specialTags.push(`promovisao pešaka u ${PIECE_NAMES_SR[detail.move.promotion] || detail.move.promotion}`);
      }
      const moveStr = detail.move
        ? `${actorLabel} (${detail.move.color === 'w' ? 'Beli' : 'Crni'}) je pomerio ${pieceAcc} sa ${detail.move.fromSquare || '?'} na ${detail.move.toSquare || '?'}${specialTags.length ? ` i ${specialTags.join(', ')}` : ''}.`
        : 'Partija je u toku.';
      const outcomeStr = isCheckmate
        ? isPlayerMove
          ? 'KRAJ PARTIJE: IGRAČ JE POBEDIO ŠAH-MATOM!'
          : 'KRAJ PARTIJE: AI PROTIVNIK JE MATIRAO IGRAČA (igrač je izgubio).'
        : isDraw
          ? `KRAJ PARTIJE: REMI (${detail.drawReason === 'repetition' ? 'trostruko ponavljanje' : detail.drawReason === 'fifty-move' ? 'pravilo 50 poteza' : 'pat'}).`
          : detail.inCheck
            ? isPlayerMove
              ? 'Igrač je dao ŠAH protivniku!'
              : 'AI protivnik je dao ŠAH igraču!'
            : 'Partija se nastavlja.';
      const qualityNote =
        isPlayerMove && detail.moveQuality === 'blunder'
          ? `- Šahovska ocena poteza: VELIKA GREŠKA / BLUNDER (igrač je izgubio oko ${Math.max(200, detail.cpLoss || 200) / 100} pešaka prednosti${detail.evalLabel ? `, ocena ${detail.evalLabel}` : ''}). Reaguj na ovu grešku u svom stilu!`
          : isPlayerMove && detail.moveQuality === 'mistake'
            ? `- Šahovska ocena poteza: nepreciznost / greška (${detail.cpLoss ? `-${(detail.cpLoss / 100).toFixed(1)} pešaka` : 'pad pozicije'}).`
            : detail.evalLabel
              ? `- Procena pozicije (ne spominji suvoparne brojeve): ${detail.evalLabel}.`
              : '';

      const prompt = `${persona.systemPrompt}

Trenutno stanje u igri:
- Igrač vodi: ${detail.playerColor === 'w' ? 'Bele figure' : 'Crne figure'}
- Potez broj: ${detail.moveCount}
- Poslednji potez: ${moveStr}
- Ishod poteza: ${outcomeStr}
${qualityNote}
${boardDescription ? `- Dodatni opis table: ${boardDescription}` : ''}

Napiši kratku reakciju (1-2 rečenice) u svom karakteru, obraćajući se direktno igraču.`;

      const text = await this.generateViaProxy(prompt);
      return text || fallback;
    } catch (err) {
      console.warn('Gemini generateContent error, using fallback:', err);
      return fallback;
    }
  }

  public async getUndoReaction(personaId: PersonaId): Promise<string> {
    const persona = PERSONAS[personaId] || PERSONAS.mentor;

    const undoFallbacks: Record<PersonaId, string[]> = {
      mentor: [
        '⏳ Vreme je vraćeno. Mudra odluka — sagledaj tablu ponovo i zaštiti svoje trupe.',
        '⏳ Pravi majstor uči iz grešaka. Sada imaš priliku da povučeš bolji potez!',
      ],
      roast: [
        '⏳ Aha! Vraćaš vreme?! Taj blunder ti zauvek ostaje zabeležen u mom dosijeu!',
        '⏳ Ctrl+Z u šahu? Džabe vraćaš majstore, video sam šta si hteo da doniraš!',
        '⏳ Bežiš od posledica? Pravi mađioničari ne priznaju greške, ali okej...',
      ],
      rival: [
        '⏳ Kukavico! Vraćaš vreme jer si se uplašio mog napada? Neka ti bude, ponovi izazov!',
        '⏳ Samo slabići traže drugu šansu pred mojim oklopom. Odigraj ponovo ako smeš!',
      ],
    };

    const fallback = getRandom(undoFallbacks[personaId] || undoFallbacks.mentor);

    const configured = await this.checkServerStatus();
    if (!configured) {
      return fallback;
    }

    try {
      const prompt = `${persona.systemPrompt}

Igrač je upravo iskoristio funkciju VRATI POTEZ (Undo / Time Rewind).
Prokomentariši to u 1 do 2 kratke rečenice u svom karakteru!`;

      const text = await this.generateViaProxy(prompt);
      return text || fallback;
    } catch {
      return fallback;
    }
  }

  public async getHint(
    personaId: PersonaId,
    currentTurn: 'w' | 'b',
    legalMovesSummary?: string[],
    stockfishHint?: StockfishHintContext | null
  ): Promise<string> {
    const persona = PERSONAS[personaId] || PERSONAS.mentor;

    const buildConcreteFallback = () => {
      if (stockfishHint) {
        const pieceAcc = stockfishHint.pieceType
          ? PIECE_NAMES_SR[stockfishHint.pieceType] || 'figuru'
          : 'figuru';
        const pieceNom = stockfishHint.pieceType
          ? PIECE_NOM_SR[stockfishHint.pieceType] || 'figura'
          : 'figura';
        const promoSuffix = stockfishHint.promotion
          ? ` (promocija u ${PIECE_NAMES_SR[stockfishHint.promotion] || stockfishHint.promotion})`
          : '';
        if (personaId === 'roast') {
          return `💡 Ako već ne vidiš očigledno: pomeri ${pieceAcc} sa ${stockfishHint.fromSquare} na ${stockfishHint.toSquare}${promoSuffix}. Zahvali mi kasnije!`;
        }
        if (personaId === 'rival') {
          return `💡 Čak bi i šegrt video da ${pieceNom} sa ${stockfishHint.fromSquare} treba na ${stockfishHint.toSquare}${promoSuffix}. Povuči potez ako smeš!`;
        }
        return `💡 Obrati pažnju na polja koja sam označio: pomeri ${pieceAcc} sa ${stockfishHint.fromSquare} na ${stockfishHint.toSquare}${promoSuffix} da ojačaš poziciju.`;
      }
      const offlineHints = [
        '💡 Obrati pažnju na kontrolu centralnih polja i sigurnost svog kralja pre nego što kreneš u napad!',
        '💡 Proveri da li neka od tvojih figura stoji nebranjena — dobar igrač uvek prvo štiti svoje trupe.',
        '💡 Potraži figure koje još nisu razvijene sa početnih polja i uvedi ih u igru!',
      ];
      return getRandom(offlineHints);
    };

    const configured = await this.checkServerStatus();
    if (!configured) {
      return buildConcreteFallback();
    }

    try {
      const movesStr = legalMovesSummary?.slice(0, 8).join(', ') || 'Nema dostupnih poteza.';
      const stockfishStr = stockfishHint
        ? `- Najbolji potez po šahovskom endžinu: ${stockfishHint.pieceType ? PIECE_NOM_SR[stockfishHint.pieceType] || stockfishHint.pieceType : 'figura'} sa polja ${stockfishHint.fromSquare} na ${stockfishHint.toSquare}${stockfishHint.promotion ? ` (promocija u ${PIECE_NAMES_SR[stockfishHint.promotion] || stockfishHint.promotion})` : ''}. (Polja su već označena na tabli.)`
        : `- Neki od dozvoljenih poteza su: ${movesStr}.`;

      const prompt = `${persona.systemPrompt}

Igrač je tražio SAVET za sledeći potez.
- Na potezu je: ${currentTurn === 'w' ? 'Beli' : 'Crni'}.
${stockfishStr}

${stockfishHint
  ? `Objasni igraču u 1-2 rečenice u svom karakteru zašto je potez sa ${stockfishHint.fromSquare} na ${stockfishHint.toSquare} najbolji (spomeni figuru i ciljno polje ${stockfishHint.toSquare}, bez suvoparno dugačkih analiza).`
  : 'Daj početniku jedan prijateljski, jasan savet šta da traži na tabli ili koju figuru da aktivira. Maksimalno 2 rečenice!'}`;

      const text = await this.generateViaProxy(prompt);
      return text || buildConcreteFallback();
    } catch (err) {
      console.warn('Gemini hint error, using fallback:', err);
      return buildConcreteFallback();
    }
  }

  public async extractFenFromBoardImage(
    request: BoardFromImageRequest,
    fetchImpl: typeof fetch = fetch
  ): Promise<BoardFromImageResult> {
    try {
      const response = await fetchImpl('/api/gemini/board-from-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: request.imageBase64,
          mimeType: request.mimeType,
          turnHint: request.turnHint || 'auto',
          perspectiveHint: request.perspectiveHint || 'auto',
        }),
      });

      const payload = (await response.json().catch(() => null)) as BoardFromImageResult | null;
      if (!response.ok || !payload?.ok || !payload.fen) {
        return {
          ok: false,
          configured: payload?.configured,
          rawFen: payload?.rawFen,
          error:
            payload?.error ||
            'Slika pozicije nije mogla da se obradi. Proveri da li se cela šahovska tabla jasno vidi.',
        };
      }

      return {
        ok: true,
        configured: payload.configured ?? true,
        fen: payload.fen,
        turn: payload.turn === 'b' ? 'b' : 'w',
        perspective: payload.perspective === 'b' ? 'b' : 'w',
        confidence: payload.confidence || 'medium',
        notes: payload.notes || '',
      };
    } catch (err) {
      return {
        ok: false,
        error:
          err instanceof Error && err.message
            ? err.message
            : 'Greška pri slanju slike serveru.',
      };
    }
  }
}

export const geminiService = new GeminiService();

