import { useEffect, useRef, useState } from 'react';
import { ACADEMY_AREAS, LESSONS_BY_AREA, type AcademyAreaId } from '../services/academyCatalog';
import { academyProgression } from '../services/academyProgression';
import { PUZZLES } from '../services/puzzleCatalog';

type AcademyProps = {
  view: 'home' | 'puzzle';
  puzzleId: string | null;
  feedback: 'idle' | 'wrong' | 'solved';
  hintCount: number;
  error: string | null;
  onClose: () => void;
  onOpenPuzzle: (id: string) => void;
  onNextPuzzle: () => void;
  onLeavePuzzle: () => void;
  hasNextPuzzle: boolean;
  onShowHint: () => void;
  onRetry: () => void;
};

type AreaId = AcademyAreaId | 'puzzles';

export function Academy({
  view,
  puzzleId,
  feedback,
  hintCount,
  error,
  onClose,
  onOpenPuzzle,
  onNextPuzzle,
  onLeavePuzzle,
  hasNextPuzzle,
  onShowHint,
  onRetry
}: AcademyProps) {
  const [selectedArea, setSelectedArea] = useState<AreaId | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [, setProgressVersion] = useState(0);
  const puzzle = PUZZLES.find((item) => item.id === puzzleId);
  const panelRef = useRef<HTMLElement | null>(null);
  const selectedLesson = selectedArea && selectedArea !== 'puzzles' && selectedLessonId
    ? LESSONS_BY_AREA[selectedArea].find((lesson) => lesson.id === selectedLessonId)
    : undefined;
  const currentLessons = selectedArea && selectedArea !== 'puzzles' ? LESSONS_BY_AREA[selectedArea] : [];
  const currentLessonIndex = selectedLessonsIndex(currentLessons, selectedLessonId);
  const completedLessons = selectedArea ? academyProgression.getCompleted(selectedArea) : [];

  useEffect(() => {
    if (view !== 'puzzle') return;
    document.body.classList.add('academy-puzzle-active');
    return () => document.body.classList.remove('academy-puzzle-active');
  }, [view]);

  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0 });
  }, [view, selectedArea, selectedLessonId]);

  useEffect(() => {
    if (feedback !== 'solved' || !puzzleId) return;
    if (academyProgression.markCompleted('puzzles', puzzleId)) {
      setProgressVersion((version) => version + 1);
    }
  }, [feedback, puzzleId]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (view === 'puzzle') {
        onLeavePuzzle();
      } else if (selectedLessonId) {
        setSelectedLessonId(null);
        setSelectedAnswer(null);
        setAnswerSubmitted(false);
      } else if (selectedArea) {
        setSelectedArea(null);
      } else {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, onLeavePuzzle, selectedArea, selectedLessonId, view]);

  const openLesson = (id: string) => {
    setSelectedLessonId(id);
    setSelectedAnswer(null);
    setAnswerSubmitted(false);
  };

  const answerLesson = () => {
    if (!selectedLesson || selectedAnswer === null) return;
    setAnswerSubmitted(true);
    if (selectedAnswer === selectedLesson.answer && selectedArea && selectedArea !== 'puzzles') {
      if (academyProgression.markCompleted(selectedArea, selectedLesson.id)) {
        setProgressVersion((version) => version + 1);
      }
    }
  };

  const advanceLesson = () => {
    const nextLesson = currentLessons[currentLessonIndex + 1];
    if (nextLesson) openLesson(nextLesson.id);
    else {
      setSelectedLessonId(null);
      setSelectedAnswer(null);
      setAnswerSubmitted(false);
    }
  };

  const goBack = () => {
    if (view === 'puzzle') {
      onLeavePuzzle();
    } else if (selectedLessonId) {
      setSelectedLessonId(null);
      setSelectedAnswer(null);
      setAnswerSubmitted(false);
    } else if (selectedArea) {
      setSelectedArea(null);
    } else {
      onClose();
    }
  };

  const title = view === 'puzzle' ? 'Zagonetka' : selectedLesson?.title || (selectedArea ? ACADEMY_AREAS.find((area) => area.id === selectedArea)?.title : 'Šahovska akademija');

  return (
    <div
      className={`academy-backdrop ${view === 'puzzle' ? 'puzzle-mode' : ''}`}
      role="dialog"
      aria-modal={view === 'home'}
      aria-labelledby="academy-title"
    >
      <section className="academy-panel" ref={panelRef}>
        <header className="academy-header">
          <div>
            <p className="academy-eyebrow">WIZARD CHESS • UČIONICA</p>
            <h1 id="academy-title">{title}</h1>
          </div>
          <button type="button" className="academy-close" onClick={goBack} aria-label={view === 'puzzle' || selectedArea ? 'Nazad' : 'Nazad u partiju'}>
            {view === 'puzzle' || selectedArea ? '←' : '✕'}
          </button>
        </header>

        {error ? <p className="academy-error" role="alert">{error}</p> : null}

        {view === 'puzzle' && puzzle ? (
          <div className="academy-puzzle-content">
            <div className="academy-puzzle-heading">
              <span className="academy-tag">TAKTIČKA VEŽBA · MAT U 1</span>
              <h2>{puzzle.instruction}</h2>
              <p>Izaberi figuru na tabli, pa polje na koje želiš da je pomeriš.</p>
            </div>

            {feedback === 'solved' ? (
              <div className="academy-feedback success" role="status" aria-live="polite">
                <strong>Odlično! Pronašao si mat.</strong>
                <p>{puzzle.explanation}</p>
              </div>
            ) : feedback === 'wrong' ? (
              <div className="academy-feedback retry" role="status" aria-live="polite">
                <strong>Taj potez nije mat.</strong>
                <p>Vrati zagonetku na početak i probaj ponovo, ili zatraži nagoveštaj.</p>
              </div>
            ) : (
              <div className="academy-feedback neutral" role="status">
                <strong>Na potezu su {puzzle.turn === 'w' ? 'beli' : 'crni'}.</strong>
                <p>Potraži potez koji ispunjava cilj zagonetke.</p>
              </div>
            )}

            {hintCount > 0 ? (
              <div className="academy-hint" role="status" aria-live="polite">
                <strong>Nagoveštaj {hintCount} / {puzzle.hints.length}</strong>
                <p>{puzzle.hints[Math.min(hintCount - 1, puzzle.hints.length - 1)]}</p>
              </div>
            ) : null}

            <div className="academy-actions">
              <button
                type="button"
                className="academy-secondary-button"
                onClick={onShowHint}
                disabled={hintCount >= puzzle.hints.length || feedback === 'solved'}
              >
                💡 {hintCount >= puzzle.hints.length ? 'Svi nagoveštaji prikazani' : 'Traži nagoveštaj'}
              </button>
              {(feedback === 'wrong' || feedback === 'solved') ? (
                <button type="button" className="academy-primary-compact" onClick={onRetry}>Pokušaj ponovo</button>
              ) : null}
              {feedback === 'solved' && hasNextPuzzle ? (
                <button type="button" className="academy-primary-compact" onClick={onNextPuzzle}>Sledeća zagonetka →</button>
              ) : null}
              <button type="button" className="academy-secondary-button" onClick={onLeavePuzzle}>Nazad na zagonetke</button>
            </div>
          </div>
        ) : !selectedArea ? (
          <>
            <p className="academy-intro">
              Uči kroz kratke izazove. Pogrešan pokušaj je deo vežbe — tabla i tvoja partija su na sigurnom.
            </p>
            <div className="academy-progress-summary">
              Završeno: {academyProgression.getTotalCompleted()} aktivnosti
            </div>
            <div className="academy-area-grid">
              {ACADEMY_AREAS.map((area) => {
                const count = area.id === 'puzzles'
                  ? PUZZLES.length
                  : LESSONS_BY_AREA[area.id].length;
                const done = academyProgression.getCompleted(area.id);
                return (
                  <button
                    type="button"
                    className="academy-area-card available"
                    key={area.id}
                    onClick={() => setSelectedArea(area.id)}
                  >
                    <span className="academy-area-icon" aria-hidden="true">{area.icon}</span>
                    <div className="academy-area-copy">
                      <div className="academy-area-heading">
                        <h2>{area.title}</h2>
                        <span>{done.length}/{count}</span>
                      </div>
                      <p>{area.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <footer className="academy-footer">
              <span>Učenje i napredak rade i bez Gemini API ključa.</span>
              <button type="button" className="academy-secondary-button" onClick={onClose}>Nazad u partiju</button>
            </footer>
          </>
        ) : selectedArea === 'puzzles' ? (
          <>
            <p className="academy-intro">Izaberi kratak izazov. Nagoveštaji i objašnjenja su dostupni tokom vežbe.</p>
            <div className="academy-puzzle-list">
              {PUZZLES.map((item, index) => {
                const done = academyProgression.getCompleted('puzzles').includes(item.id);
                return (
                  <button
                    type="button"
                    className="academy-primary-button"
                    key={item.id}
                    onClick={() => onOpenPuzzle(item.id)}
                  >
                    <span>{item.title}{done ? ' ✓' : ''}</span>
                    <span className="academy-puzzle-meta">Zagonetka {index + 1} od {PUZZLES.length} · Mat u 1</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : selectedLesson ? (
          <div className="academy-puzzle-content">
            <div className="academy-puzzle-heading">
              <span className="academy-tag">{selectedLesson.subtitle}</span>
              <p>{selectedLesson.lesson}</p>
            </div>
            <div className="academy-quiz">
              <h2>{selectedLesson.question}</h2>
              <div className="academy-quiz-options">
                {selectedLesson.options.map((option, index) => {
                  const isCorrect = answerSubmitted && index === selectedLesson.answer;
                  const isWrong = answerSubmitted && index === selectedAnswer && index !== selectedLesson.answer;
                  return (
                    <button
                      type="button"
                      key={option}
                      className={`academy-quiz-option ${selectedAnswer === index ? 'selected' : ''} ${isCorrect ? 'correct' : ''} ${isWrong ? 'incorrect' : ''}`}
                      onClick={() => {
                        if (!answerSubmitted) setSelectedAnswer(index);
                      }}
                      disabled={answerSubmitted}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              {answerSubmitted ? (
                <div className={`academy-feedback ${selectedAnswer === selectedLesson.answer ? 'success' : 'retry'}`} role="status" aria-live="polite">
                  <strong>{selectedAnswer === selectedLesson.answer ? 'Tačno!' : 'Nije baš — pogledaj objašnjenje.'}</strong>
                  <p>{selectedLesson.explanation}</p>
                  <p><b>Za poneti:</b> {selectedLesson.takeaway}</p>
                </div>
              ) : null}
              <div className="academy-actions">
                {!answerSubmitted ? (
                  <button type="button" className="academy-primary-compact" onClick={answerLesson} disabled={selectedAnswer === null}>
                    Proveri odgovor
                  </button>
                ) : selectedAnswer === selectedLesson.answer ? (
                  <button type="button" className="academy-primary-compact" onClick={advanceLesson}>
                    {currentLessonIndex < currentLessons.length - 1 ? 'Sledeća lekcija →' : 'Nazad na oblast'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="academy-primary-compact"
                    onClick={() => {
                      setSelectedAnswer(null);
                      setAnswerSubmitted(false);
                    }}
                  >
                    Pokušaj ponovo
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            <p className="academy-intro">
              Napredak sačuvan: {completedLessons.length} od {currentLessons.length} lekcija.
            </p>
            <div className="academy-puzzle-list">
              {currentLessons.map((lesson, index) => (
                <button
                  type="button"
                  className="academy-primary-button"
                  key={lesson.id}
                  onClick={() => openLesson(lesson.id)}
                >
                  <span>{lesson.title}{completedLessons.includes(lesson.id) ? ' ✓' : ''}</span>
                  <span className="academy-puzzle-meta">{index + 1} od {currentLessons.length} · {lesson.subtitle}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function selectedLessonsIndex(lessons: { id: string }[], id: string | null) {
  return lessons.findIndex((lesson) => lesson.id === id);
}
