import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { ACADEMY_AREAS, LESSONS_BY_AREA, type AcademyAreaId } from '../services/academyCatalog';
import { academyProgression } from '../services/academyProgression';
import { soundService } from '../services/soundService';
import { PUZZLES } from '../services/puzzleCatalog';
import {
  ACADEMY_TUTORIAL_CATEGORIES,
  CHESS_ACADEMY_LESSONS,
  type AcademyCategory,
  type ChessAcademyLesson
} from '../data/chessAcademyLessons';
import { reconstructLessonFen } from '../services/pgnService';
import {
  fetchLichessMasterGamePgn,
  fetchLichessMasterStats,
  getCachedLichessMasterStats,
  type LichessMasterStats
} from '../services/lichessExplorerService';
import {
  fetchChessComUserGames,
  fetchLichessUserGames,
  fetchPgnFromOnlineUrl,
  type RemoteChessGameSummary
} from '../services/onlineChessImportService';

type ImportSourceTab = 'masters' | 'online' | 'file';

const MASTERS_POSITION_PRESETS: { id: string; label: string; fen: string }[] = [
  {
    id: 'start',
    label: 'Početna pozicija',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  },
  {
    id: 'italian',
    label: 'Italijanska partija (C50)',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3'
  },
  {
    id: 'spanish',
    label: 'Španska partija (C60)',
    fen: 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3'
  },
  {
    id: 'sicilian',
    label: 'Sicilijanska odbrana (B20)',
    fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'
  },
  {
    id: 'queens-gambit',
    label: 'Damin gambit (D06)',
    fen: 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 2'
  }
];

type AcademyProps = {
  view: 'home' | 'puzzle' | 'tutorial';
  puzzleId: string | null;
  feedback: 'idle' | 'wrong' | 'solved';
  hintCount: number;
  tutorialLessonId: string;
  tutorialStepIndex: number;
  tutorialAnimating: boolean;
  tutorialGameOver: boolean;
  customLessons: ChessAcademyLesson[];
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
  onImportPgn: (pgnText: string) => { ok: boolean; error?: string };
  onDeleteCustomLesson: (lessonId: string) => void;
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
  customLessons,
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
  onLeaveTutorial,
  onImportPgn,
  onDeleteCustomLesson
}: AcademyProps) {
  const [selectedArea, setSelectedArea] = useState<AreaId | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [, setProgressVersion] = useState(0);
  const [importerOpen, setImporterOpen] = useState(false);
  const [importTab, setImportTab] = useState<ImportSourceTab>('masters');
  const [pgnDraft, setPgnDraft] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [loadingGameId, setLoadingGameId] = useState<string | null>(null);
  const [mastersPresetId, setMastersPresetId] = useState<string>('start');
  const [importerMastersStats, setImporterMastersStats] = useState<LichessMasterStats>({
    status: 'idle',
    totalGames: 0,
    topMoves: [],
    topGames: []
  });
  const [onlineUrlInput, setOnlineUrlInput] = useState('');
  const [onlinePlatform, setOnlinePlatform] = useState<'lichess' | 'chesscom'>('lichess');
  const [onlineUsername, setOnlineUsername] = useState('');
  const [onlineSearchLoading, setOnlineSearchLoading] = useState(false);
  const [onlineGames, setOnlineGames] = useState<RemoteChessGameSummary[]>([]);
  const [lichessStats, setLichessStats] = useState<LichessMasterStats>({
    status: 'idle',
    totalGames: 0,
    topMoves: [],
    topGames: []
  });
  const puzzle = PUZZLES.find((item) => item.id === puzzleId);
  const panelRef = useRef<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const onlineFetchAbortRef = useRef<AbortController | null>(null);
  const selectedLesson = selectedArea && selectedArea !== 'puzzles' && selectedLessonId
    ? LESSONS_BY_AREA[selectedArea].find((lesson) => lesson.id === selectedLessonId)
    : undefined;
  const currentLessons = selectedArea && selectedArea !== 'puzzles' ? LESSONS_BY_AREA[selectedArea] : [];
  const currentLessonIndex = selectedLessonsIndex(currentLessons, selectedLessonId);
  const completedLessons = selectedArea ? academyProgression.getCompleted(selectedArea) : [];
  const completedTutorials = academyProgression.getCompletedTutorials();

  const allTutorialLessons = [...customLessons, ...CHESS_ACADEMY_LESSONS];
  const activeTutorialLesson =
    allTutorialLessons.find((lesson) => lesson.id === tutorialLessonId) || allTutorialLessons[0];
  const activeTutorialCategory = activeTutorialLesson.category;
  const lessonsInTutorialCategory = allTutorialLessons.filter(
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
    if (view !== 'tutorial') return;
    const fen = reconstructLessonFen(activeTutorialLesson, tutorialStepIndex);
    const cached = getCachedLichessMasterStats(fen);
    if (cached) {
      setLichessStats(cached);
      return;
    }

    const controller = new AbortController();
    setLichessStats({ status: 'loading', totalGames: 0, topMoves: [], topGames: [] });
    const timer = window.setTimeout(() => {
      void fetchLichessMasterStats(fen, { signal: controller.signal })
        .then((res) => {
          if (!controller.signal.aborted) {
            setLichessStats(res);
          }
        })
        .catch((err) => {
          if ((err as { name?: string })?.name !== 'AbortError' && !controller.signal.aborted) {
            setLichessStats({ status: 'offline', totalGames: 0, topMoves: [], topGames: [] });
          }
        });
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [view, activeTutorialLesson, tutorialStepIndex]);

  useEffect(() => {
    if (!importerOpen || importTab !== 'masters') return;
    const targetFen =
      mastersPresetId === 'current' && view === 'tutorial'
        ? reconstructLessonFen(activeTutorialLesson, tutorialStepIndex)
        : MASTERS_POSITION_PRESETS.find((p) => p.id === mastersPresetId)?.fen ||
          MASTERS_POSITION_PRESETS[0].fen;

    const cached = getCachedLichessMasterStats(targetFen);
    if (cached) {
      setImporterMastersStats(cached);
      return;
    }

    const controller = new AbortController();
    setImporterMastersStats({ status: 'loading', totalGames: 0, topMoves: [], topGames: [] });
    void fetchLichessMasterStats(targetFen, { signal: controller.signal })
      .then((res) => {
        if (!controller.signal.aborted) {
          setImporterMastersStats(res);
        }
      })
      .catch((err) => {
        if ((err as { name?: string })?.name !== 'AbortError' && !controller.signal.aborted) {
          setImporterMastersStats({ status: 'offline', totalGames: 0, topMoves: [], topGames: [] });
        }
      });

    return () => controller.abort();
  }, [importerOpen, importTab, mastersPresetId, view, activeTutorialLesson, tutorialStepIndex]);

  useEffect(() => {
    return () => {
      onlineFetchAbortRef.current?.abort();
    };
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

  const handlePgnFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      setPgnDraft(text);
      setImportError(null);
      const res = onImportPgn(text);
      if (res.ok) {
        setImporterOpen(false);
        setPgnDraft('');
      } else {
        setImportError(res.error || 'Neispravan PGN fajl.');
      }
    } catch {
      setImportError('Nije uspelo čitanje izabranog PGN fajla.');
    }
  };

  const handleSubmitPgnImport = () => {
    setImportError(null);
    const res = onImportPgn(pgnDraft);
    if (res.ok) {
      setImporterOpen(false);
      setPgnDraft('');
    } else {
      setImportError(res.error || 'Neispravan PGN zapis.');
    }
  };

  const handleLoadMasterGame = async (gameId: string) => {
    if (loadingGameId || tutorialAnimating) return;
    onlineFetchAbortRef.current?.abort();
    const controller = new AbortController();
    onlineFetchAbortRef.current = controller;
    setLoadingGameId(gameId);
    setImportError(null);
    try {
      const pgn = await fetchLichessMasterGamePgn(gameId, { signal: controller.signal });
      if (controller.signal.aborted) return;
      const res = onImportPgn(pgn);
      if (res.ok) {
        setImporterOpen(false);
      } else {
        setImportError(res.error || 'Master partija nije mogla da se učita.');
      }
    } catch (err) {
      if ((err as { name?: string })?.name !== 'AbortError') {
        setImportError(
          err instanceof Error ? err.message : 'Preuzimanje master partije nije uspelo.'
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoadingGameId(null);
      }
    }
  };

  const handleFetchFromOnlineUrl = async () => {
    if (onlineSearchLoading || loadingGameId) return;
    onlineFetchAbortRef.current?.abort();
    const controller = new AbortController();
    onlineFetchAbortRef.current = controller;
    setOnlineSearchLoading(true);
    setImportError(null);
    try {
      const pgn = await fetchPgnFromOnlineUrl(onlineUrlInput, { signal: controller.signal });
      if (controller.signal.aborted) return;
      const res = onImportPgn(pgn);
      if (res.ok) {
        setImporterOpen(false);
        setOnlineUrlInput('');
      } else {
        setImportError(res.error || 'Preuzeti PGN nije mogao da se učita.');
      }
    } catch (err) {
      if ((err as { name?: string })?.name !== 'AbortError') {
        setImportError(
          err instanceof Error ? err.message : 'Nije uspelo preuzimanje partije sa linka.'
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        setOnlineSearchLoading(false);
      }
    }
  };

  const handleSearchOnlinePlayerGames = async () => {
    if (onlineSearchLoading || loadingGameId) return;
    onlineFetchAbortRef.current?.abort();
    const controller = new AbortController();
    onlineFetchAbortRef.current = controller;
    setOnlineSearchLoading(true);
    setImportError(null);
    setOnlineGames([]);
    try {
      const results =
        onlinePlatform === 'lichess'
          ? await fetchLichessUserGames(onlineUsername, { max: 8, signal: controller.signal })
          : await fetchChessComUserGames(onlineUsername, { max: 8, signal: controller.signal });
      if (!controller.signal.aborted) {
        setOnlineGames(results);
      }
    } catch (err) {
      if ((err as { name?: string })?.name !== 'AbortError') {
        setImportError(
          err instanceof Error ? err.message : 'Pretraga partija korisnika nije uspela.'
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        setOnlineSearchLoading(false);
      }
    }
  };

  const handleLoadRemoteSummary = (game: RemoteChessGameSummary) => {
    setImportError(null);
    const res = onImportPgn(game.pgn);
    if (res.ok) {
      setImporterOpen(false);
    } else {
      setImportError(res.error || 'Partija nije mogla da se učita u 3D Tutorijal.');
    }
  };

  const formatMasterResult = (winner?: 'white' | 'black' | null) =>
    winner === 'white' ? '1-0' : winner === 'black' ? '0-1' : '½-½';

  const renderPgnImporterBox = () => {
    if (!importerOpen) return null;
    return (
      <div id="academy-pgn-importer" className="academy-pgn-importer">
        <div className="academy-pgn-importer-top">
          <strong>Uvoz partije u 3D Tutorijal</strong>
          <button
            type="button"
            className="academy-pgn-close-inline"
            onClick={() => {
              setImporterOpen(false);
              setImportError(null);
            }}
          >
            Zatvori
          </button>
        </div>

        <div className="academy-importer-tabs" role="tablist" aria-label="Izvor uvoza partije">
          <button
            type="button"
            role="tab"
            id="tab-import-masters"
            aria-selected={importTab === 'masters'}
            className={`academy-importer-tab ${importTab === 'masters' ? 'active' : ''}`}
            onClick={() => {
              setImportError(null);
              setImportTab('masters');
            }}
          >
            Lichess Masters
          </button>
          <button
            type="button"
            role="tab"
            id="tab-import-online"
            aria-selected={importTab === 'online'}
            className={`academy-importer-tab ${importTab === 'online' ? 'active' : ''}`}
            onClick={() => {
              setImportError(null);
              setImportTab('online');
            }}
          >
            Lichess / Chess.com
          </button>
          <button
            type="button"
            role="tab"
            id="tab-import-file"
            aria-selected={importTab === 'file'}
            className={`academy-importer-tab ${importTab === 'file' ? 'active' : ''}`}
            onClick={() => {
              setImportError(null);
              setImportTab('file');
            }}
          >
            Fajl / Tekst
          </button>
        </div>

        {importTab === 'masters' ? (
          <div className="academy-importer-pane">
            <div className="academy-importer-field-row">
              <label className="academy-tutorial-label" htmlFor="select-masters-preset">
                Izaberi otvaranje iz Lichess Masters baze
              </label>
              <select
                id="select-masters-preset"
                className="academy-tutorial-select"
                value={mastersPresetId}
                onChange={(e) => setMastersPresetId(e.target.value)}
              >
                {view === 'tutorial' ? (
                  <option value="current">Trenutna pozicija na tabli</option>
                ) : null}
                {MASTERS_POSITION_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>

            {importerMastersStats.status === 'loading' ? (
              <p className="academy-lichess-note">Preuzimanje velemajstorskih partija...</p>
            ) : importerMastersStats.status === 'rate-limited' ? (
              <p className="academy-lichess-note">
                Lichess API privremeno ograničava zahteve. Pokušaj za minut.
              </p>
            ) : importerMastersStats.status === 'offline' ? (
              <p className="academy-lichess-note">
                Lichess Masters baza trenutno nije dostupna.
              </p>
            ) : importerMastersStats.topGames.length === 0 ? (
              <p className="academy-lichess-note">
                Nema pronađenih master partija za ovu poziciju.
              </p>
            ) : (
              <ul className="academy-remote-games-list">
                {importerMastersStats.topGames.map((game) => (
                  <li key={game.id} className="academy-remote-game-row">
                    <div className="academy-remote-game-info">
                      <strong>
                        {game.whiteName}
                        {game.whiteRating ? ` (${game.whiteRating})` : ''} – {game.blackName}
                        {game.blackRating ? ` (${game.blackRating})` : ''}
                      </strong>
                      <span>
                        {[game.year ? String(game.year) : null, formatMasterResult(game.winner)]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="academy-remote-load-btn"
                      disabled={loadingGameId !== null}
                      onClick={() => void handleLoadMasterGame(game.id)}
                    >
                      {loadingGameId === game.id ? 'Učitavanje...' : 'Učitaj u 3D'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : importTab === 'online' ? (
          <div className="academy-importer-pane">
            <div className="academy-importer-field-row">
              <label className="academy-tutorial-label" htmlFor="input-online-pgn-url">
                Direktan link ka Lichess partiji ili studiji
              </label>
              <div className="academy-importer-input-group">
                <input
                  id="input-online-pgn-url"
                  type="text"
                  className="academy-importer-input"
                  value={onlineUrlInput}
                  onChange={(e) => {
                    setOnlineUrlInput(e.target.value);
                    if (importError) setImportError(null);
                  }}
                  placeholder="https://lichess.org/30WVeXdd ili link studije"
                />
                <button
                  type="button"
                  id="btn-fetch-online-url"
                  className="academy-primary-compact"
                  disabled={onlineSearchLoading || loadingGameId !== null}
                  onClick={() => void handleFetchFromOnlineUrl()}
                >
                  {onlineSearchLoading ? 'Preuzimanje...' : 'Preuzmi'}
                </button>
              </div>
            </div>

            <div className="academy-importer-field-row">
              <label className="academy-tutorial-label" htmlFor="input-online-username">
                Poslednje partije igrača (Lichess / Chess.com)
              </label>
              <div className="academy-importer-input-group">
                <select
                  aria-label="Izaberi šahovski sajt"
                  className="academy-importer-platform-select"
                  value={onlinePlatform}
                  onChange={(e) => {
                    setOnlinePlatform(e.target.value === 'chesscom' ? 'chesscom' : 'lichess');
                    setOnlineGames([]);
                    setImportError(null);
                  }}
                >
                  <option value="lichess">Lichess</option>
                  <option value="chesscom">Chess.com</option>
                </select>
                <input
                  id="input-online-username"
                  type="text"
                  className="academy-importer-input"
                  value={onlineUsername}
                  onChange={(e) => {
                    setOnlineUsername(e.target.value);
                    if (importError) setImportError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleSearchOnlinePlayerGames();
                    }
                  }}
                  placeholder={onlinePlatform === 'lichess' ? 'npr. DrNykterstein' : 'npr. Hikaru'}
                />
                <button
                  type="button"
                  id="btn-fetch-player-games"
                  className="academy-secondary-button"
                  disabled={onlineSearchLoading || loadingGameId !== null}
                  onClick={() => void handleSearchOnlinePlayerGames()}
                >
                  {onlineSearchLoading ? 'Tražim...' : 'Pronađi'}
                </button>
              </div>
            </div>

            {onlineGames.length > 0 ? (
              <ul className="academy-remote-games-list">
                {onlineGames.map((game) => (
                  <li key={game.id} className="academy-remote-game-row">
                    <div className="academy-remote-game-info">
                      <strong>
                        {game.whiteName}
                        {game.whiteRating ? ` (${game.whiteRating})` : ''} – {game.blackName}
                        {game.blackRating ? ` (${game.blackRating})` : ''}
                      </strong>
                      <span>
                        {[game.result, game.openingName, game.dateLabel]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="academy-remote-load-btn"
                      onClick={() => handleLoadRemoteSummary(game)}
                    >
                      Učitaj u 3D
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <div className="academy-importer-pane">
            <div className="academy-pgn-importer-top">
              <span className="academy-tutorial-label">Fajl sa diska ili nalepjeni PGN</span>
              <button
                type="button"
                className="academy-pgn-file-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                Izaberi .pgn fajl
              </button>
              <input
                ref={fileInputRef}
                id="input-pgn-file"
                className="academy-pgn-file-input"
                type="file"
                accept=".pgn,.txt"
                onChange={handlePgnFileChange}
              />
            </div>
            <textarea
              id="textarea-pgn-input"
              className="academy-pgn-textarea"
              rows={4}
              value={pgnDraft}
              onChange={(e) => {
                setPgnDraft(e.target.value);
                if (importError) setImportError(null);
              }}
              placeholder="Nalepi PGN tekst partije (npr. 1. e4 e5 2. Nf3 Nc6 3. Bb5...)"
            />
            <div className="academy-pgn-actions">
              <button
                type="button"
                id="btn-submit-pgn-import"
                className="academy-primary-compact"
                onClick={handleSubmitPgnImport}
              >
                Uvezi partiju
              </button>
            </div>
          </div>
        )}

        {importError ? (
          <p className="academy-pgn-error" role="alert">
            {importError}
          </p>
        ) : null}
      </div>
    );
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
            <div className="academy-tutorial-toolbar">
              <button
                type="button"
                id="btn-open-pgn-import"
                className="academy-pgn-trigger-btn"
                disabled={tutorialAnimating}
                onClick={() => {
                  setImportError(null);
                  setImporterOpen((prev) => !prev);
                }}
              >
                {importerOpen ? 'Zatvori uvoz PGN' : '📂 Učitaj PGN'}
              </button>
              {activeTutorialLesson.isCustom ? (
                <button
                  type="button"
                  id="btn-delete-custom-pgn"
                  className="academy-delete-pgn-btn"
                  disabled={tutorialAnimating}
                  onClick={() => onDeleteCustomLesson(activeTutorialLesson.id)}
                >
                  Obriši
                </button>
              ) : null}
            </div>

            {renderPgnImporterBox()}

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
                      const firstInCat = allTutorialLessons.find(
                        (item) => item.category === category.id
                      );
                      if (firstInCat) onSelectTutorialLesson(firstInCat.id);
                    }}
                  >
                    {category.shortLabel}
                  </button>
                );
              })}
              {customLessons.length > 0 ? (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTutorialCategory === 'Uvezene'}
                  className={`academy-tutorial-tab ${activeTutorialCategory === 'Uvezene' ? 'active' : ''}`}
                  disabled={tutorialAnimating}
                  onClick={() => {
                    if (customLessons[0]) onSelectTutorialLesson(customLessons[0].id);
                  }}
                >
                  Uvezene ({customLessons.length})
                </button>
              ) : null}
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

            <section id="academy-lichess-box" className="academy-lichess-box" aria-live="polite">
              <div className="academy-lichess-header">
                <span className="academy-lichess-eyebrow">LICHESS MASTERS BAZA</span>
                {lichessStats.status === 'ready' ? (
                  <span className="academy-lichess-meta">
                    {[
                      lichessStats.eco,
                      lichessStats.openingName,
                      `${lichessStats.totalGames.toLocaleString('sr-RS')} partija`
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                ) : null}
              </div>

              {lichessStats.status === 'loading' ? (
                <p className="academy-lichess-note">Učitavanje velemajstorske statistike...</p>
              ) : lichessStats.status === 'empty' ? (
                <p className="academy-lichess-note">Pozicija van master baze.</p>
              ) : lichessStats.status === 'rate-limited' ? (
                <p className="academy-lichess-note">
                  Privremeno ograničenje zahteva. Pokušaj ponovo za minut.
                </p>
              ) : lichessStats.status === 'offline' ? (
                <p className="academy-lichess-note">
                  Velemajstorska statistika trenutno nije dostupna.
                </p>
              ) : lichessStats.status === 'ready' ? (
                <>
                  <ul className="academy-lichess-moves">
                    {lichessStats.topMoves.map((move) => (
                      <li key={move.uci} className="academy-lichess-move-row">
                        <div className="academy-lichess-move-top">
                          <strong className="academy-lichess-san">{move.san}</strong>
                          <span className="academy-lichess-games">
                            {move.totalGames.toLocaleString('sr-RS')} partija
                          </span>
                          <span className="academy-lichess-pcts">
                            B {move.whitePct}% · R {move.drawPct}% · C {move.blackPct}%
                          </span>
                        </div>
                        <svg
                          className="academy-lichess-wdl-bar"
                          viewBox="0 0 100 6"
                          preserveAspectRatio="none"
                          aria-hidden="true"
                        >
                          <rect x={0} y={0} width={move.whitePct} height={6} fill="#eceef2" />
                          <rect
                            x={move.whitePct}
                            y={0}
                            width={move.drawPct}
                            height={6}
                            fill="#64748b"
                          />
                          <rect
                            x={move.whitePct + move.drawPct}
                            y={0}
                            width={move.blackPct}
                            height={6}
                            fill="#1f2937"
                          />
                        </svg>
                      </li>
                    ))}
                  </ul>
                  {lichessStats.topGames.length > 0 ? (
                    <div className="academy-lichess-top-games">
                      <span className="academy-lichess-subhead">
                        Master partije iz ove pozicije
                      </span>
                      <ul className="academy-remote-games-list">
                        {lichessStats.topGames.map((game) => (
                          <li key={game.id} className="academy-remote-game-row">
                            <div className="academy-remote-game-info">
                              <strong>
                                {game.whiteName}
                                {game.whiteRating ? ` (${game.whiteRating})` : ''} – {game.blackName}
                                {game.blackRating ? ` (${game.blackRating})` : ''}
                              </strong>
                              <span>
                                {[game.year ? String(game.year) : null, formatMasterResult(game.winner)]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="academy-remote-load-btn"
                              disabled={loadingGameId !== null || tutorialAnimating}
                              onClick={() => void handleLoadMasterGame(game.id)}
                            >
                              {loadingGameId === game.id ? 'Učitavanje...' : 'Učitaj u 3D'}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : null}
            </section>

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
                <div className="academy-mentor-header-right">
                  <button
                    type="button"
                    id="btn-open-pgn-import"
                    className="academy-pgn-trigger-btn"
                    onClick={() => {
                      setImportError(null);
                      setImporterOpen((prev) => !prev);
                    }}
                  >
                    {importerOpen ? 'Zatvori uvoz' : '📂 Učitaj PGN'}
                  </button>
                  <span className="academy-mentor-progress">
                    {completedTutorials.length}/{CHESS_ACADEMY_LESSONS.length}
                  </span>
                </div>
              </div>
              <p className="academy-mentor-desc">
                Pokreni poteze korak po korak direktno na 3D tabli uz komentare mentora, statistiku velemajstora ili uvezi sopstvenu PGN partiju.
              </p>

              {renderPgnImporterBox()}

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
                {customLessons.length > 0 ? (
                  <button
                    type="button"
                    className="academy-mentor-cat-btn academy-mentor-cat-custom"
                    onClick={() => onOpenTutorial('Uvezene')}
                  >
                    <div className="academy-mentor-cat-top">
                      <strong>Uvezene partije ({customLessons.length})</strong>
                      <span>PGN</span>
                    </div>
                    <p>Tvoje sačuvane PGN partije spremne za 3D analizu i preuzimanje.</p>
                  </button>
                ) : null}
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
