import { useEffect, useRef, useState } from 'react';
import { ACADEMY_AREAS, LESSONS_BY_AREA, type AcademyAreaId } from '../services/academyCatalog';
import { academyProgression } from '../services/academyProgression';
import { soundService } from '../services/soundService';
import { PUZZLES } from '../services/puzzleCatalog';
import {
  ACADEMY_TUTORIAL_CATEGORIES,
  CHESS_ACADEMY_LESSONS,
  type AcademyCategory
} from '../data/chessAcademyLessons';

type AcademyProps = {
  view: 'home' | 'puzzle' | 'tutorial';
  puzzleId: string | null;
  feedback: 'idle' | 'wrong' | 'solved';
  hintCount: number;
  tutorialLessonId: string;
  tutorialStepIndex: number;
  tutorialAnimating: boolean;
  tutorialGameOver: boolean;
  error: string | null;
  onClose: () => void;
  onOpenPuzzle: (id: string) => void;
  onNextPuzzle: () => void;
  onLeavePuzzle: () => void;
  hasNextPuzzle: boolean;
  onShowHint: () => void;
  onRetry: () => void;
  onOpenTutorial: (category?: AcademyCategory) => void;
  onSelectTutorialLesson: (lessonId: string) => void;
  onPlayTutorialStep: () => void;
  onResetTutorialLesson: () => void;
  onTakeOverTutorial: () => void;
  onLeaveTutorial: () => void;
};

type AreaId = AcademyAreaId | 'puzzles';

export function Academy({
  view,
  puzzleId,
  feedback,
  hintCount,
  tutorialLessonId,
  tutorialStepIndex,
  tutorialAnimating,
  tutorialGameOver,
  error,
  onClose,
  onOpenPuzzle,
  onNextPuzzle,
  onLeavePuzzle,
  hasNextPuzzle,
  onShowHint,
  onRetry,
  onOpenTutorial,
  onSelectTutorialLesson,
  onPlayTutorialStep,
  onResetTutorialLesson,
  onTakeOverTutorial,
  onLeaveTutorial
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
  const completedTutorials = academyProgression.getCompletedTutorials();

  const activeTutorialLesson =
    CHESS_ACADEMY_LESSONS.find((lesson) => lesson.id === tutorialLessonId) || CHESS_ACADEMY_LESSONS[0];
  const activeTutorialCategory = activeTutorialLesson.category;
  const lessonsInTutorialCategory = CHESS_ACADEMY_LESSONS.filter(
    (lesson) => lesson.category === activeTutorialCategory
  );
  const activeTutorialIndexInCategory = lessonsInTutorialCategory.findIndex(
    (lesson) => lesson.id === activeTutorialLesson.id
  );
  const nextTutorialLesson =
    activeTutorialIndexInCategory >= 0
      ? lessonsInTutorialCategory[activeTutorialIndexInCategory + 1]
      : undefined;
  const totalTutorialSteps = activeTutorialLesson.steps.length;
  const isTutorialFinished = tutorialStepIndex >= totalTutorialSteps;
  const currentTutorialStep =
    tutorialStepIndex > 0 ? activeTutorialLesson.steps[tutorialStepIndex - 1] : null;
  const nextTutorialStep =
    tutorialStepIndex < totalTutorialSteps ? activeTutorialLesson.steps[tutorialStepIndex] : null;

  useEffect(() => {
    const unsubscribe = academyProgression.subscribe(() => {
      setProgressVersion((version) => version + 1);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (view !== 'puzzle' && view !== 'tutorial') return;
    document.body.classList.add('academy-puzzle-active');
    return () => document.body.classList.remove('academy-puzzle-active');
  }, [view]);

  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0 });
  }, [view, selectedArea, selectedLessonId, tutorialLessonId]);

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
      } else if (view === 'tutorial') {
        onLeaveTutorial();
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
  }, [onClose, onLeavePuzzle, onLeaveTutorial, selectedArea, selectedLessonId, view]);

  const openLesson = (id: string) => {
    setSelectedLessonId(id);
    setSelectedAnswer(null);
    setAnswerSubmitted(false);
  };

  const answerLesson = () => {
    if (!selectedLesson || selectedAnswer === null) return;
    setAnswerSubmitted(true);
    if (selectedAnswer === selectedLesson.answer) {
      soundService.playCheckmate();
      if (selectedArea && selectedArea !== 'puzzles') {
        if (academyProgression.markCompleted(selectedArea, selectedLesson.id)) {
          setProgressVersion((version) => version + 1);
        }
      }
    } else {
      soundService.playCheck();
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
    } else if (view === 'tutorial') {
      onLeaveTutorial();
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

  const isBoardDockMode = view === 'puzzle' || view === 'tutorial';
  const title =
    view === 'puzzle'
      ? 'Zagonetka'
      : view === 'tutorial'
        ? activeTutorialLesson.name
        : selectedLesson?.title ||
          (selectedArea
            ? ACADEMY_AREAS.find((area) => area.id === selectedArea)?.title
            : 'Šahovska akademija');

  return (
    <div
      className={`academy-backdrop ${isBoardDockMode ? 'puzzle-mode' : ''}`}
      role="dialog"
      aria-modal={view === 'home'}
      aria-labelledby="academy-title"
    >
      <section className="academy-panel" ref={panelRef}>
        <header className="academy-header">
          <div>
            <p className="academy-eyebrow">
              {view === 'tutorial' ? 'MENTOR ALISTAIR • 3D TUTORIJAL' : 'WIZARD CHESS • UČIONICA'}
            </p>
            <h1 id="academy-title">{title}</h1>
          </div>
          <button
            type="button"
            className="academy-close"
            onClick={goBack}
            aria-label={isBoardDockMode || selectedArea ? 'Nazad' : 'Nazad u partiju'}
          >
            {isBoardDockMode || selectedArea ? '←' : '✕'}
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
        ) : view === 'tutorial' ? (
          <div className="academy-tutorial-content">
            <div className="academy-tutorial-tabs" role="tablist" aria-label="Kategorije 3D tutorijala">
              {ACADEMY_TUTORIAL_CATEGORIES.map((category) => {
                const isActive = category.id === activeTutorialCategory;
                return (
                  <button
                    key={category.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`academy-tutorial-tab ${isActive ? 'active' : ''}`}
                    disabled={tutorialAnimating}
                    onClick={() => {
                      const firstInCat = CHESS_ACADEMY_LESSONS.find(
                        (item) => item.category === category.id
                      );
                      if (firstInCat) onSelectTutorialLesson(firstInCat.id);
                    }}
                  >
                    {category.shortLabel}
                  </button>
                );
              })}
            </div>

            <div className="academy-tutorial-picker">
              <label className="academy-tutorial-label" htmlFor="academy-tutorial-select">
                Izabrana lekcija
              </label>
              <select
                id="academy-tutorial-select"
                className="academy-tutorial-select"
                value={activeTutorialLesson.id}
                disabled={tutorialAnimating}
                onChange={(e) => onSelectTutorialLesson(e.target.value)}
              >
                {lessonsInTutorialCategory.map((lesson) => {
                  const isDone = completedTutorials.includes(lesson.id);
                  return (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.name} ({lesson.badge}){isDone ? ' ✓' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="academy-tutorial-meta">
              <span>
                {activeTutorialLesson.badge} · {activeTutorialLesson.difficulty} ·{' '}
                {activeTutorialLesson.category === 'Odbrana' ? 'Crni pogled' : 'Beli pogled'}
              </span>
              <span className="academy-tutorial-counter">
                Korak {tutorialStepIndex} / {totalTutorialSteps}
              </span>
            </div>

            <article className="academy-tutorial-card" aria-live="polite">
              <div className="academy-tutorial-step-code">
                {currentTutorialStep
                  ? `Potez ${currentTutorialStep.moveNumber}`
                  : 'POČETNA POZICIJA'}
              </div>
              <h2>
                {currentTutorialStep
                  ? currentTutorialStep.title
                  : activeTutorialLesson.name}
              </h2>
              <p>
                {currentTutorialStep
                  ? currentTutorialStep.explanation
                  : activeTutorialLesson.summary}
              </p>
              {isTutorialFinished ? (
                <p className="academy-tutorial-done">
                  {tutorialGameOver
                    ? 'Lekcija je završena šah-matom. Klikni „Ispočetka“ za ponovni pregled ili izaberi sledeću lekciju.'
                    : 'Svi potezi lekcije su prikazani ✓. Možeš odmah preuzeti partiju odavde ili preći na sledeću lekciju.'}
                </p>
              ) : nextTutorialStep ? (
                <p className="academy-tutorial-next-hint">
                  Sledeći potez: <strong>{nextTutorialStep.moveNumber}</strong>
                </p>
              ) : null}
            </article>

            <div className="academy-actions">
              {!isTutorialFinished ? (
                <button
                  type="button"
                  id="btn-tutorial-next-step"
                  className="academy-primary-compact"
                  disabled={tutorialAnimating}
                  onClick={onPlayTutorialStep}
                >
                  {tutorialAnimating
                    ? 'Animacija poteza...'
                    : tutorialStepIndex === 0
                      ? 'Pokreni 1. potez →'
                      : 'Sledeći potez →'}
                </button>
              ) : nextTutorialLesson ? (
                <button
                  type="button"
                  id="btn-tutorial-next-lesson"
                  className="academy-primary-compact"
                  disabled={tutorialAnimating}
                  onClick={() => onSelectTutorialLesson(nextTutorialLesson.id)}
                >
                  Sledeća lekcija →
                </button>
              ) : null}

              <button
                type="button"
                id="btn-tutorial-reset"
                className="academy-secondary-button"
                disabled={tutorialStepIndex === 0 || tutorialAnimating}
                onClick={onResetTutorialLesson}
              >
                ↺ Ispočetka
              </button>

              <button
                type="button"
                id="btn-tutorial-takeover"
                className="academy-takeover-button"
                disabled={tutorialAnimating || tutorialGameOver}
                title={
                  tutorialGameOver
                    ? 'Partija je već završena matom na tabli'
                    : 'Preuzmi ovu poziciju i nastavi partiju protiv AI protivnika'
                }
                onClick={onTakeOverTutorial}
              >
                ⚔ Igraj odavde
              </button>

              <button
                type="button"
                className="academy-secondary-button"
                disabled={tutorialAnimating}
                onClick={onLeaveTutorial}
              >
                Nazad
              </button>
            </div>
          </div>
        ) : !selectedArea ? (
          <>
            <p className="academy-intro">
              Uči kroz kratke izazove i interaktivne 3D poteze na tabli. Pogrešan pokušaj je deo vežbe — tvoja partija ostaje sačuvana.
            </p>
            <div className="academy-progress-summary">
              Završeno: {academyProgression.getTotalCompleted()} aktivnosti
            </div>

            <section className="academy-mentor-feature" aria-labelledby="academy-mentor-heading">
              <div className="academy-mentor-header">
                <div>
                  <p className="academy-eyebrow">3D MENTOR ALISTAIR</p>
                  <h2 id="academy-mentor-heading">Interaktivni 3D Tutorijal (30 lekcija)</h2>
                </div>
                <span className="academy-mentor-progress">
                  {completedTutorials.length}/{CHESS_ACADEMY_LESSONS.length}
                </span>
              </div>
              <p className="academy-mentor-desc">
                Pokreni poteze korak po korak direktno na 3D tabli uz komentare mentora i nastavi borbu iz bilo koje pozicije.
              </p>
              <div className="academy-mentor-cats">
                {ACADEMY_TUTORIAL_CATEGORIES.map((category) => {
                  const catLessons = CHESS_ACADEMY_LESSONS.filter(
                    (item) => item.category === category.id
                  );
                  const catDone = catLessons.filter((item) =>
                    completedTutorials.includes(item.id)
                  ).length;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      className="academy-mentor-cat-btn"
                      onClick={() => onOpenTutorial(category.id)}
                    >
                      <div className="academy-mentor-cat-top">
                        <strong>{category.label}</strong>
                        <span>{catDone}/{catLessons.length}</span>
                      </div>
                      <p>{category.description}</p>
                    </button>
                  );
                })}
              </div>
            </section>

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
