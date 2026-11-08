import asyncio
import os
import edge_tts

VOICE = "sr-RS-NicholasNeural"

PERSONA_SETTINGS = {
    "mentor": {"pitch": "-4Hz", "rate": "-4%"},
    "roast": {"pitch": "+35Hz", "rate": "+15%"},
    "rival": {"pitch": "+0Hz", "rate": "+5%"}
}

def to_cyrillic(text: str) -> str:
    mapping = {
        'dž': 'џ', 'Dž': 'Џ', 'DŽ': 'Џ',
        'lj': 'љ', 'Lj': 'Љ', 'LJ': 'Љ',
        'nj': 'њ', 'Nj': 'Њ', 'NJ': 'Њ',
        'a': 'а', 'A': 'А', 'b': 'б', 'B': 'Б', 'v': 'в', 'V': 'В',
        'g': 'г', 'G': 'Г', 'd': 'д', 'D': 'Д', 'đ': 'ђ', 'Đ': 'Ђ',
        'e': 'е', 'E': 'Е', 'ž': 'ж', 'Ž': 'Ж', 'z': 'з', 'Z': 'З',
        'i': 'и', 'I': 'И', 'j': 'ј', 'J': 'Ј', 'k': 'к', 'K': 'К',
        'l': 'л', 'L': 'Л', 'm': 'м', 'M': 'М', 'n': 'н', 'N': 'Н',
        'o': 'о', 'O': 'О', 'p': 'п', 'P': 'П', 'r': 'р', 'R': 'Р',
        's': 'с', 'S': 'С', 't': 'т', 'T': 'Т', 'ć': 'ћ', 'Ć': 'Ћ',
        'u': 'у', 'U': 'У', 'f': 'ф', 'F': 'Ф', 'h': 'х', 'H': 'Х',
        'c': 'ц', 'C': 'Ц', 'č': 'ч', 'Č': 'Ч', 'š': 'ш', 'Š': 'Ш'
    }
    for k, v in mapping.items():
        text = text.replace(k, v)
    return text

PHRASES = {
    "mentor": {
        "greeting": "Pozdrav, šegrte! Ja sam Alistair. Tu sam da te vodim i učinim svaki potez jasnim.",
        "opening_0": "Dobar početak! Kontrola centralnih polja daje tvojim figurama slobodu kretanja.",
        "opening_1": "Razvijaj lake figure, skakače i lovce, pre nego što kreneš u napad!",
        "capture_0": "Odličan udarac! Kamena figura je razbijena, ali pazi na uzvratni napad.",
        "capture_1": "Svaka osvojena figura menja ravnotežu na tabli. Nastavi promišljeno.",
        "check_0": "Šah! Protivnički kralj je u opasnosti, drži pritisak!",
        "check_1": "Kralj je napadnut! Sada je trenutak da vidiš gde su mu putevi za bekstvo.",
        "blunder_0": "Oprez, šegrte! Ova figura je možda ostala nebranjena. Uvek proveri gde protivnik cilja.",
        "blunder_1": "Ne brini za grešku — svaki poraz je samo lekcija na putu do velemajstora.",
        "checkmate_0": "Mat! Maestralna pobeda u sanctumu, dokazao si svoju snagu!",
        "checkmate_1": "Sanctum se klanja novom šampionu. Odlična partija!",
        "general_0": "Pogledaj celu tablu pre sledećeg poteza — magija je u strpljenju.",
        "general_1": "Tvoje pozicije postaju sve čvršće. Samo mirno.",
        "undo_0": "Vreme je vraćeno. Mudra odluka — sagledaj tablu ponovo i zaštiti svoje trupe.",
        "undo_1": "Pravi majstor uči iz grešaka. Sada imaš priliku da povučeš bolji potez!",
        "hint_0": "Obrati pažnju na kontrolu centralnih polja i sigurnost svog kralja pre nego što kreneš u napad!",
        "hint_1": "Proveri da li neka od tvojih figura stoji nebranjena — dobar igrač uvek prvo štiti svoje trupe.",
        "hint_2": "Potraži figure koje još nisu razvijene sa početnih polja i uvedi ih u igru!"
    },
    "roast": {
        "greeting": "Oho, stigao novi izazivač! Ja sam Grix. Pazi šta vučeš, jer ne praštam blundere!",
        "opening_0": "Brat otvorio sa ovim? Vidim da teorija otvaranja nije bila na meniju danas.",
        "opening_1": "Hrabar potez... ili čist larping, videćemo za dva kruga.",
        "capture_0": "BAM! Otišla figura u paramparčad! Ovaj udarac je boleo i kroz ekran.",
        "capture_1": "Donacija uspešno prihvaćena! Hvala lepo, dođite nam opet.",
        "check_0": "ŠAH! Kralj beži kao da mu gori katedrala pod nogama!",
        "check_1": "Panika u redovima, gde ćeš sad sa krunom majstore?",
        "blunder_0": "Brate, šta je ovo bilo?! Da li ti igraš šah ili deliš poklone za praznike?",
        "blunder_1": "Definicija skil išjua u jednom jedinom kliku. Moj rejting plače.",
        "checkmate_0": "GG! Matčina veka! Vreme je da se ugasi igrica i ode na svež vazduh.",
        "checkmate_1": "Zatvaraj katedralu, motaj kablove — ovo je bio apsolutni potop!",
        "general_0": "Razmišljaš duže nego što meni treba da naučim kvantnu fiziku. Odigraj nešto!",
        "general_1": "Gledam tablu i ne verujem šta vidim, ali dobro, sloboda izbora...",
        "undo_0": "Aha! Vraćaš vreme?! Taj blunder ti zauvek ostaje zabeležen u mom dosijeu!",
        "undo_1": "Kontrol zet u šahu? Džabe vraćaš majstore, video sam šta si hteo da doniraš!",
        "undo_2": "Bežiš od posledica? Pravi mađioničari ne priznaju greške, ali okej...",
        "hint_0": "Pazi na kralja majstore, eno ti figura visi kao luster!",
        "hint_1": "Ako ne znaš šta da odigraš, bar nemoj da doniraš kraljicu u jednom potezu.",
        "hint_2": "Razvijaj tog konja i lovca, ne drži ih na klupi za rezerve!"
    },
    "rival": {
        "greeting": "Ja sam Valerius, nepobedivi vitez sanctuma! Da vidimo da li imaš hrabrosti.",
        "opening_0": "Postavljaš svoje pešake? Moj oklop ne probijaju tako jeftine varke!",
        "opening_1": "Kreni napred, izazivaču! Da vidimo od čega si napravljen.",
        "capture_0": "Jedna figura manje! Ali pravi rat tek počinje, šegrte.",
        "capture_1": "Pala je kamena garda! Moja osveta će biti brza i nemilosrdna.",
        "check_0": "Šah! Klekni pred mojim trupama, tvoj kralj drhti!",
        "check_1": "Oseti gnev mojih figura — nema tog štita koji te može spasiti!",
        "blunder_0": "Hahaha! Kakav naivan potez! Znao sam da nisi dorastao ovom dvoboju.",
        "blunder_1": "Tvoja nepažnja je moja najveća gozba. Gledaj kako tvoja odbrana nestaje.",
        "checkmate_0": "Kraj je! Sudbina je zapečaćena, pobeda pripada najdostojnijem!",
        "checkmate_1": "Tvoj kralj je pao u prašinu. Zauvek zapamti ovu lekciju!",
        "general_0": "Moje trupe stoje postojano. Tvoji napadi su samo vetar u magli.",
        "general_1": "Dobar pokušaj, ali daleko si od titule šampiona katedrale.",
        "undo_0": "Kukavico! Vraćaš vreme jer si se uplašio mog napada? Neka ti bude, ponovi izazov!",
        "undo_1": "Samo slabići traže drugu šansu pred mojim oklopom. Odigraj ponovo ako smeš!",
        "hint_0": "Iskuj svoj plan! Pravi ratnik napada tamo gde je neprijateljski bedem najtanji.",
        "hint_1": "Obrati pažnju na svoje bokove, moj mač ne prašta nesmotrene ispade.",
        "hint_2": "Pomeri svoje trupe prema centru, carstvo se brani sa prvih linija!"
    }
}

OUT_DIR = os.path.abspath("d:/gaistudio/wizard-chess-3d/public/assets/audio/voices")

async def generate():
    os.makedirs(OUT_DIR, exist_ok=True)
    
    for persona, phrases in PHRASES.items():
        settings = PERSONA_SETTINGS[persona]
        p_dir = os.path.join(OUT_DIR, persona)
        os.makedirs(p_dir, exist_ok=True)
        
        for key, text in phrases.items():
            out_file = os.path.join(p_dir, f"{key}.mp3")
            cyrillic_text = to_cyrillic(text)
            
            print(f"Generating: {persona}/{key}.mp3 -> '{cyrillic_text[:30]}...'")
            communicate = edge_tts.Communicate(
                text=cyrillic_text,
                voice=VOICE,
                pitch=settings["pitch"],
                rate=settings["rate"]
            )
            await communicate.save(out_file)

    print("Successfully generated all audio files in Cyrillic!")

if __name__ == "__main__":
    asyncio.run(generate())
