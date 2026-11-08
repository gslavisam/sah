import { GoogleGenAI } from '@google/genai';

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
    promotion?: string;
  } | null;
  currentTurn: 'w' | 'b';
  gameOver: boolean;
  inCheck: boolean;
  moveCount: number;
  playerColor: 'w' | 'b';
}

// Offline fallback responses for instant responsiveness and when no API key is set
const FALLBACK_REACTIONS: Record<PersonaId, {
  opening: string[];
  capture: string[];
  check: string[];
  blunder: string[];
  checkmate: string[];
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
    blunder: [
      'Oprez, šegrte! Ova figura je možda ostala nebranjena. Uvek proveri gde protivnik cilja.',
      'Ne brini za grešku — svaki poraz je samo lekcija na putu do velemajstora.',
    ],
    checkmate: [
      'Mat! Maestralna pobeda u sanctumu, dokazao si svoju snagu!',
      'Sanctum se klanja novom šampionu. Odlična partija!',
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
      'Donacija uspešno prihvaćena! Hvala lepo, dođite nam opet.',
    ],
    check: [
      'ŠAH! Kralj beži kao da mu gori katedrala pod nogama!',
      'Panika u redovima, gde ćeš sad sa krunom majstore?',
    ],
    blunder: [
      'Brate, šta je ovo bilo?! Da li ti igraš šah ili deliš poklone za praznike?',
      'Definicija "skill issue"-a u jednom jedinom kliku. Moj rejting plače.',
    ],
    checkmate: [
      'GG! Matčina veka! Vreme je da se ugasi igrica i ode na svež vazduh.',
      'Zatvaraj katedralu, motaj kablove — ovo je bio apsolutni potop!',
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
      'Pala je kamena garda! Moja osveta će biti brza i nemilosrdna.',
    ],
    check: [
      'Šah! Klekni pred mojim trupama, tvoj kralj drhti!',
      'Oseti gnev mojih figura — nema tog štita koji te može spasiti!',
    ],
    blunder: [
      'Hahaha! Kakav naivan potez! Znao sam da nisi dorastao ovom dvoboju.',
      'Tvoja nepažnja je moja najveća gozba. Gledaj kako tvoja odbrana nestaje.',
    ],
    checkmate: [
      'Kraj je! Sudbina je zapečaćena, pobeda pripada najdostojnijem!',
      'Tvoj kralj je pao u prašinu. Zauvek zapamti ovu lekciju!',
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
  private client: GoogleGenAI | null = null;
  private currentKey: string = '';

  constructor() {
    this.initClient();
  }

  private initClient() {
    const key =
      localStorage.getItem('wizard_gemini_api_key') ||
      (typeof process !== 'undefined' && (process.env.GEMINI_API_KEY || process.env.API_KEY)) ||
      '';

    if (key && key !== this.currentKey) {
      this.currentKey = key;
      try {
        this.client = new GoogleGenAI({ apiKey: key });
      } catch (e) {
        console.warn('Gemini client init error:', e);
        this.client = null;
      }
    }
  }

  public getApiKey(): string {
    return this.currentKey;
  }

  public setApiKey(key: string) {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem('wizard_gemini_api_key', trimmed);
    } else {
      localStorage.removeItem('wizard_gemini_api_key');
    }
    this.currentKey = trimmed;
    try {
      this.client = trimmed ? new GoogleGenAI({ apiKey: trimmed }) : null;
    } catch {
      this.client = null;
    }
  }

  public async getReaction(
    personaId: PersonaId,
    detail: MoveEventDetail,
    boardDescription?: string
  ): Promise<string> {
    const persona = PERSONAS[personaId] || PERSONAS.mentor;
    const pool = FALLBACK_REACTIONS[personaId] || FALLBACK_REACTIONS.mentor;

    let fallback = getRandom(pool.general);
    if (detail.gameOver) fallback = getRandom(pool.checkmate);
    else if (detail.inCheck) fallback = getRandom(pool.checkmark ?? pool.check);
    else if (detail.move?.capture) fallback = getRandom(pool.capture);
    else if (detail.moveCount <= 4) fallback = getRandom(pool.opening);

    if (!this.client || !this.currentKey) {
      return fallback;
    }

    try {
      const moveStr = detail.move
        ? `${detail.move.color === 'w' ? 'Beli' : 'Crni'} je pomerio ${detail.move.pieceType} sa ${detail.move.fromSquare || '?'} na ${detail.move.toSquare || '?'}${detail.move.capture ? ' i POJEO protivničku figuru' : ''}.`
        : 'Partija je u toku.';

      const prompt = `${persona.systemPrompt}

Trenutno stanje u igri:
- Potez broj: ${detail.moveCount}
- Poslednji potez: ${moveStr}
- Da li je šah: ${detail.inCheck ? 'DA' : 'NE'}
- Da li je mat/kraj: ${detail.gameOver ? 'DA' : 'NE'}
${boardDescription ? `- Dodatni opis table: ${boardDescription}` : ''}

Napiši kratku reakciju (1-2 rečenice) u svom karakteru.`;

      const response = await this.client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const text = response.text?.trim();
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

    if (!this.client || !this.currentKey) {
      return fallback;
    }

    try {
      const prompt = `${persona.systemPrompt}

Igrač je upravo iskoristio funkciju VRATI POTEZ (Undo / Time Rewind).
Prokomentariši to u 1 do 2 kratke rečenice u svom karakteru!`;

      const response = await this.client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return response.text?.trim() || fallback;
    } catch {
      return fallback;
    }
  }

  public async getHint(
    personaId: PersonaId,
    currentTurn: 'w' | 'b',
    legalMovesSummary?: string[]
  ): Promise<string> {
    const persona = PERSONAS[personaId] || PERSONAS.mentor;

    if (!this.client || !this.currentKey) {
      const offlineHints = [
        '💡 Obrati pažnju na kontrolu centralnih polja i sigurnost svog kralja pre nego što kreneš u napad!',
        '💡 Proveri da li neka od tvojih figura stoji nebranjena — dobar igrač uvek prvo štiti svoje trupe.',
        '💡 Potraži figure koje još nisu razvijene sa početnih polja i uvedi ih u igru!',
      ];
      return getRandom(offlineHints);
    }

    try {
      const movesStr = legalMovesSummary?.slice(0, 8).join(', ') || 'Nema dostupnih poteza.';
      const prompt = `${persona.systemPrompt}

Igrač je tražio SAVET za sledeći potez.
- Na potezu je: ${currentTurn === 'w' ? 'Beli' : 'Crni'}.
- Neki od dozvoljenih poteza su: ${movesStr}.

Daj početniku jedan prijateljski, jasan savet šta da traži na tabli ili koju figuru da aktivira. Maksimalno 2 rečenice!`;

      const response = await this.client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return response.text?.trim() || '💡 Pazi na centar table i uvek proveri gde protivnik može da uzvrati!';
    } catch (err) {
      console.warn('Gemini hint error, using fallback:', err);
      return '💡 Pokušaj da aktiviraš figuru koja do sada nije učestvovala u borbi!';
    }
  }
}

export const geminiService = new GeminiService();

