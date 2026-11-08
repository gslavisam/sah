import { PersonaId } from './geminiService';

// Normalizes Serbian Latin / Cyrillic text for matching against pre-rendered audio keys
function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .replace(/[čć]/g, 'c')
    .replace(/[š]/g, 's')
    .replace(/[ž]/g, 'z')
    .replace(/[đ]/g, 'dj')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const PRE_RENDERED_AUDIO: { key: string; persona: PersonaId; path: string }[] = [
  // Mentor (Alistair)
  { key: 'pozdrav segrte ja sam alistair', persona: 'mentor', path: '/assets/audio/voices/mentor/greeting.mp3' },
  { key: 'dobar pocetak kontrola centralnih', persona: 'mentor', path: '/assets/audio/voices/mentor/opening_0.mp3' },
  { key: 'razvijaj lake figure', persona: 'mentor', path: '/assets/audio/voices/mentor/opening_1.mp3' },
  { key: 'odlican udarac kamena figura', persona: 'mentor', path: '/assets/audio/voices/mentor/capture_0.mp3' },
  { key: 'svaka osvojena figura menja', persona: 'mentor', path: '/assets/audio/voices/mentor/capture_1.mp3' },
  { key: 'sah protivnicki kralj je u opasnosti', persona: 'mentor', path: '/assets/audio/voices/mentor/check_0.mp3' },
  { key: 'kralj je napadnut', persona: 'mentor', path: '/assets/audio/voices/mentor/check_1.mp3' },
  { key: 'oprez segrte ova figura', persona: 'mentor', path: '/assets/audio/voices/mentor/blunder_0.mp3' },
  { key: 'ne brini za gresku', persona: 'mentor', path: '/assets/audio/voices/mentor/blunder_1.mp3' },
  { key: 'mat maestralna pobeda', persona: 'mentor', path: '/assets/audio/voices/mentor/checkmate_0.mp3' },
  { key: 'sanctum se klanja novom', persona: 'mentor', path: '/assets/audio/voices/mentor/checkmate_1.mp3' },
  { key: 'pogledaj celu tablu', persona: 'mentor', path: '/assets/audio/voices/mentor/general_0.mp3' },
  { key: 'tvoje pozicije postaju sve cvrsce', persona: 'mentor', path: '/assets/audio/voices/mentor/general_1.mp3' },
  { key: 'vreme je vraceno mudra odluka', persona: 'mentor', path: '/assets/audio/voices/mentor/undo_0.mp3' },
  { key: 'pravi majstor uci iz gresaka', persona: 'mentor', path: '/assets/audio/voices/mentor/undo_1.mp3' },
  { key: 'obrati paznju na kontrolu centralnih', persona: 'mentor', path: '/assets/audio/voices/mentor/hint_0.mp3' },
  { key: 'proveri da li neka od tvojih figura', persona: 'mentor', path: '/assets/audio/voices/mentor/hint_1.mp3' },
  { key: 'potrazi figure koje jos nisu', persona: 'mentor', path: '/assets/audio/voices/mentor/hint_2.mp3' },

  // Roastmaster (Grix)
  { key: 'oho stigao novi izazivac ja sam grix', persona: 'roast', path: '/assets/audio/voices/roast/greeting.mp3' },
  { key: 'brat otvorio sa ovim', persona: 'roast', path: '/assets/audio/voices/roast/opening_0.mp3' },
  { key: 'hrabar potez ili cist larping', persona: 'roast', path: '/assets/audio/voices/roast/opening_1.mp3' },
  { key: 'bam otisla figura u paramparcad', persona: 'roast', path: '/assets/audio/voices/roast/capture_0.mp3' },
  { key: 'donacija uspesno prihvacena', persona: 'roast', path: '/assets/audio/voices/roast/capture_1.mp3' },
  { key: 'sah kralj bezi kao da mu gori', persona: 'roast', path: '/assets/audio/voices/roast/check_0.mp3' },
  { key: 'panika u redovima gde ces sad', persona: 'roast', path: '/assets/audio/voices/roast/check_1.mp3' },
  { key: 'brate sta je ovo bilo', persona: 'roast', path: '/assets/audio/voices/roast/blunder_0.mp3' },
  { key: 'definicija skill issue', persona: 'roast', path: '/assets/audio/voices/roast/blunder_1.mp3' },
  { key: 'definicija skil isjua', persona: 'roast', path: '/assets/audio/voices/roast/blunder_1.mp3' },
  { key: 'gg matcina veka', persona: 'roast', path: '/assets/audio/voices/roast/checkmate_0.mp3' },
  { key: 'zatvaraj katedralu motaj kablove', persona: 'roast', path: '/assets/audio/voices/roast/checkmate_1.mp3' },
  { key: 'razmisljas duze nego sto meni treba', persona: 'roast', path: '/assets/audio/voices/roast/general_0.mp3' },
  { key: 'gledam tablu i ne verujem', persona: 'roast', path: '/assets/audio/voices/roast/general_1.mp3' },
  { key: 'aha vracas vreme', persona: 'roast', path: '/assets/audio/voices/roast/undo_0.mp3' },
  { key: 'ctrl z u sahu', persona: 'roast', path: '/assets/audio/voices/roast/undo_1.mp3' },
  { key: 'kontrol zet u sahu', persona: 'roast', path: '/assets/audio/voices/roast/undo_1.mp3' },
  { key: 'dzabe vracas majstore', persona: 'roast', path: '/assets/audio/voices/roast/undo_1.mp3' },
  { key: 'bezis od posledica pravi madjionicari', persona: 'roast', path: '/assets/audio/voices/roast/undo_2.mp3' },
  { key: 'pazi na kralja majstore', persona: 'roast', path: '/assets/audio/voices/roast/hint_0.mp3' },
  { key: 'ako ne znas sta da odigras', persona: 'roast', path: '/assets/audio/voices/roast/hint_1.mp3' },
  { key: 'razvijaj tog konja i lovca', persona: 'roast', path: '/assets/audio/voices/roast/hint_2.mp3' },

  // Rival (Valerius)
  { key: 'ja sam valerius nepobedivi vitez', persona: 'rival', path: '/assets/audio/voices/rival/greeting.mp3' },
  { key: 'postavljas svoje pesake moj oklop', persona: 'rival', path: '/assets/audio/voices/rival/opening_0.mp3' },
  { key: 'kreni napred izazivacu', persona: 'rival', path: '/assets/audio/voices/rival/opening_1.mp3' },
  { key: 'jedna figura manje ali pravi rat', persona: 'rival', path: '/assets/audio/voices/rival/capture_0.mp3' },
  { key: 'pala je kamena garda moja osveta', persona: 'rival', path: '/assets/audio/voices/rival/capture_1.mp3' },
  { key: 'sah klekni pred mojim trupama', persona: 'rival', path: '/assets/audio/voices/rival/check_0.mp3' },
  { key: 'oseti gnev mojih figura', persona: 'rival', path: '/assets/audio/voices/rival/check_1.mp3' },
  { key: 'hahaha kakav naivan potez', persona: 'rival', path: '/assets/audio/voices/rival/blunder_0.mp3' },
  { key: 'tvoja nepaznja je moja najveca gozba', persona: 'rival', path: '/assets/audio/voices/rival/blunder_1.mp3' },
  { key: 'kraj je sudbina je zapecacena', persona: 'rival', path: '/assets/audio/voices/rival/checkmate_0.mp3' },
  { key: 'tvoj kralj je pao u prasinu', persona: 'rival', path: '/assets/audio/voices/rival/checkmate_1.mp3' },
  { key: 'moje trupe stoje postojano', persona: 'rival', path: '/assets/audio/voices/rival/general_0.mp3' },
  { key: 'dobar pokusaj ali daleko si od titule', persona: 'rival', path: '/assets/audio/voices/rival/general_1.mp3' },
  { key: 'kukavico vracas vreme', persona: 'rival', path: '/assets/audio/voices/rival/undo_0.mp3' },
  { key: 'samo slabici traze drugu sansu', persona: 'rival', path: '/assets/audio/voices/rival/undo_1.mp3' },
  { key: 'iskuj svoj plan pravi ratnik', persona: 'rival', path: '/assets/audio/voices/rival/hint_0.mp3' },
  { key: 'obrati paznju na svoje bokove', persona: 'rival', path: '/assets/audio/voices/rival/hint_1.mp3' },
  { key: 'pomeri svoje trupe prema centru', persona: 'rival', path: '/assets/audio/voices/rival/hint_2.mp3' },
];

class VoiceService {
  private enabled: boolean = true;
  private currentAudio: HTMLAudioElement | null = null;

  constructor() {
    const saved = localStorage.getItem('wizard_voice_enabled');
    if (saved !== null) {
      this.enabled = saved === 'true';
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public toggleVoice(): boolean {
    this.enabled = !this.enabled;
    localStorage.setItem('wizard_voice_enabled', String(this.enabled));
    if (!this.enabled) {
      this.stop();
    }
    return this.enabled;
  }

  public stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  public speak(text: string, personaId: PersonaId) {
    if (!this.enabled || typeof window === 'undefined') {
      return;
    }

    this.stop();

    const cleanText = text
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/[*_#`~]/g, '')
      .trim();

    if (!cleanText) return;

    const normalized = normalizeText(cleanText);

    // 1. Direct match: Exact pre-rendered Neural Serbian MP3
    const matched = PRE_RENDERED_AUDIO.find(
      (item) => item.persona === personaId && (normalized.includes(item.key) || item.key.includes(normalized))
    );

    if (matched) {
      this.playAudioFile(matched.path);
      return;
    }

    // 2. Contextual keyword match for dynamic responses
    let fallbackPath = `/assets/audio/voices/${personaId}/general_0.mp3`;

    if (normalized.includes('mat')) {
      fallbackPath = `/assets/audio/voices/${personaId}/checkmate_0.mp3`;
    } else if (normalized.includes('sah')) {
      fallbackPath = `/assets/audio/voices/${personaId}/check_0.mp3`;
    } else if (normalized.includes('udarac') || normalized.includes('uzim') || normalized.includes('figura') || normalized.includes('bam')) {
      fallbackPath = `/assets/audio/voices/${personaId}/capture_0.mp3`;
    } else if (normalized.includes('gresk') || normalized.includes('blunder') || normalized.includes('oprez')) {
      fallbackPath = `/assets/audio/voices/${personaId}/blunder_0.mp3`;
    } else if (normalized.includes('vreme') || normalized.includes('vrac') || normalized.includes('ponov')) {
      fallbackPath = `/assets/audio/voices/${personaId}/undo_0.mp3`;
    } else if (normalized.includes('savet') || normalized.includes('paz') || normalized.includes('centar')) {
      fallbackPath = `/assets/audio/voices/${personaId}/hint_0.mp3`;
    } else if (normalized.includes('pozdrav') || normalized.includes('ja sam') || normalized.includes('izazivac')) {
      fallbackPath = `/assets/audio/voices/${personaId}/greeting.mp3`;
    }

    this.playAudioFile(fallbackPath);
  }

  private playAudioFile(path: string) {
    try {
      const audio = new Audio(path);
      this.currentAudio = audio;
      audio.play().catch((err) => {
        // Browser autoplay policy: audio play is allowed after first user click
        console.warn('Audio playback waiting for user gesture or error:', err);
      });
    } catch (e) {
      console.warn('Audio init error:', e);
    }
  }
}

export const voiceService = new VoiceService();
