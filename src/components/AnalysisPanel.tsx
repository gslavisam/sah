import React, { useEffect, useRef, useState } from 'react';

export type AnalysisTrackedSide = 'w' | 'b' | 'both';

export interface AnalysisImageStatus {
  loading: boolean;
  error: string | null;
  status: string | null;
  confidence?: 'high' | 'medium' | 'low';
}

interface Props {
  variant: 'floating' | 'embedded';
  currentFen: string;
  currentTurn: 'w' | 'b';
  trackedSide: AnalysisTrackedSide;
  imageStatus: AnalysisImageStatus;
  isBoardEditorOpen?: boolean;
  onChangeTrackedSide: (side: AnalysisTrackedSide) => void;
  onLoadFen: (fen: string) => { ok: boolean; error?: string };
  onToggleBoardTurn: () => void;
  onUploadBoardImage: (
    file: File | Blob,
    options: { turnHint: 'auto' | 'w' | 'b'; perspectiveHint: 'auto' | 'w' | 'b' }
  ) => void;
  onOpenBoardEditor?: () => void;
  onCloseAnalysis?: () => void;
}

export const AnalysisPanel: React.FC<Props> = ({
  variant,
  currentFen,
  currentTurn,
  trackedSide,
  imageStatus,
  isBoardEditorOpen = false,
  onChangeTrackedSide,
  onLoadFen,
  onToggleBoardTurn,
  onUploadBoardImage,
  onOpenBoardEditor,
  onCloseAnalysis,
}) => {
  const [fenDraft, setFenDraft] = useState(currentFen);
  const [fenFeedback, setFenFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [scanTurnHint, setScanTurnHint] = useState<'auto' | 'w' | 'b'>('auto');
  const [scanPerspectiveHint, setScanPerspectiveHint] = useState<'auto' | 'w' | 'b'>('auto');
  const [collapsed, setCollapsed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setFenDraft(currentFen);
  }, [currentFen]);

  const handleApplyFen = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const res = onLoadFen(fenDraft);
    if (res.ok) {
      setFenFeedback({ ok: true, text: 'Pozicija je učitana na tablu.' });
    } else {
      setFenFeedback({ ok: false, text: res.error || 'Neispravan FEN zapis.' });
    }
  };

  const handleCopyFen = async () => {
    const textToCopy = currentFen || fenDraft;
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setFenFeedback({ ok: true, text: 'FEN je kopiran u clipboard.' });
    } catch {
      setFenFeedback({ ok: false, text: 'Kopiranje nije uspelo — označi FEN polje ručno.' });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFenFeedback(null);
    onUploadBoardImage(file, {
      turnHint: scanTurnHint,
      perspectiveHint: scanPerspectiveHint,
    });
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type && item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        if (blob) {
          e.preventDefault();
          setFenFeedback(null);
          onUploadBoardImage(blob, {
            turnHint: scanTurnHint,
            perspectiveHint: scanPerspectiveHint,
          });
          return;
        }
      }
    }
  };

  const trackedLabel =
    trackedSide === 'w' ? 'Beli' : trackedSide === 'b' ? 'Crni' : 'Oba';

  const confidenceLabel =
    imageStatus.confidence === 'high'
      ? 'Visoka sigurnost'
      : imageStatus.confidence === 'low'
        ? 'Niska sigurnost — proveri figure'
        : 'Srednja sigurnost';

  return (
    <div
      id={variant === 'floating' ? 'analysis-panel' : 'analysis-panel-2d'}
      className={`analysis-panel analysis-panel-${variant} ${collapsed && variant === 'floating' ? 'collapsed' : ''}`}
      onPaste={handlePaste}
    >
      <div className="analysis-panel-header">
        <div className="analysis-panel-title-wrap">
          <span className="analysis-panel-badge">🔬 Analiza</span>
          <span className="analysis-panel-subtitle">
            2 strane • Pratiš: <strong>{trackedLabel}</strong>
          </span>
        </div>
        <div className="analysis-panel-header-btns">
          {variant === 'floating' && (
            <button
              type="button"
              id="btn-analysis-collapse"
              className="analysis-mini-btn"
              onClick={() => setCollapsed((prev) => !prev)}
              title={collapsed ? 'Proširi panel za analizu' : 'Skupi panel'}
            >
              {collapsed ? '▾' : '▴'}
            </button>
          )}
          {onCloseAnalysis && variant === 'floating' && (
            <button
              type="button"
              id="btn-analysis-close"
              className="analysis-mini-btn"
              onClick={onCloseAnalysis}
              title="Izađi iz Analize i vrati se u duel protiv AI"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {(!collapsed || variant === 'embedded') && (
        <div className="analysis-panel-body">
          <div className="analysis-row analysis-track-row">
            <span className="analysis-row-label">Pratiš stranu:</span>
            <div className="analysis-segmented" role="group" aria-label="Strana za praćenje saveta">
              <button
                type="button"
                id="btn-analysis-track-w"
                className={`analysis-seg-btn ${trackedSide === 'w' ? 'active' : ''}`}
                aria-pressed={trackedSide === 'w'}
                onClick={() => onChangeTrackedSide('w')}
              >
                ♔ Beli
              </button>
              <button
                type="button"
                id="btn-analysis-track-b"
                className={`analysis-seg-btn ${trackedSide === 'b' ? 'active' : ''}`}
                aria-pressed={trackedSide === 'b'}
                onClick={() => onChangeTrackedSide('b')}
              >
                ♚ Crni
              </button>
              <button
                type="button"
                id="btn-analysis-track-both"
                className={`analysis-seg-btn ${trackedSide === 'both' ? 'active' : ''}`}
                aria-pressed={trackedSide === 'both'}
                onClick={() => onChangeTrackedSide('both')}
              >
                ⮂ Oba
              </button>
            </div>

            <button
              type="button"
              id="btn-analysis-toggle-turn"
              className="analysis-turn-btn"
              onClick={onToggleBoardTurn}
              title="Promeni ko je trenutno na potezu u ovoj poziciji"
            >
              Na potezu: <strong>{currentTurn === 'w' ? 'Beli' : 'Crni'}</strong> ↻
            </button>
          </div>

          <form className="analysis-fen-row" onSubmit={handleApplyFen}>
            <input
              type="text"
              id="analysis-fen-input"
              className="analysis-fen-input"
              value={fenDraft}
              onChange={(e) => {
                setFenDraft(e.target.value);
                if (fenFeedback) setFenFeedback(null);
              }}
              placeholder="Nalepi FEN poziciju..."
              aria-label="FEN pozicija"
              spellCheck={false}
            />
            <button
              type="submit"
              id="btn-analysis-load-fen"
              className="analysis-action-btn primary"
              title="Učitaj FEN poziciju na tablu"
            >
              Učitaj FEN
            </button>
            <button
              type="button"
              id="btn-analysis-copy-fen"
              className="analysis-action-btn"
              onClick={handleCopyFen}
              title="Kopiraj trenutni FEN u clipboard"
            >
              📋
            </button>
          </form>

          <div className="analysis-image-row">
            <input
              ref={fileInputRef}
              id="input-analysis-board-image"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/*"
              className="analysis-hidden-file-input"
              onChange={handleFileChange}
            />
            <button
              type="button"
              id="btn-analysis-upload-image"
              className="analysis-action-btn upload"
              disabled={imageStatus.loading}
              onClick={() => fileInputRef.current?.click()}
              title="Učitaj screenshot ili fotografiju šahovske table (ili pritisni Ctrl+V)"
            >
              {imageStatus.loading ? '⏳ Čitam tablu...' : '📷 Slika pozicije'}
            </button>

            {onOpenBoardEditor && (
              <button
                type="button"
                id="btn-analysis-edit-board"
                className={`analysis-action-btn editor ${isBoardEditorOpen ? 'active' : ''}`}
                aria-pressed={isBoardEditorOpen}
                onClick={onOpenBoardEditor}
                title="Ručno postavi ili pomeri figure na 2D tabli i dobij predlog najboljeg poteza"
              >
                ✎ Uredi tablu
              </button>
            )}

            <select
              id="select-analysis-image-perspective"
              className="analysis-mini-select"
              value={scanPerspectiveHint}
              onChange={(e) =>
                setScanPerspectiveHint(e.target.value as 'auto' | 'w' | 'b')
              }
              aria-label="Orijentacija table na slici"
              title="Koja strana je dole na slici"
            >
              <option value="auto">Pogled: Auto</option>
              <option value="w">Beli dole</option>
              <option value="b">Crni dole</option>
            </select>

            <select
              id="select-analysis-image-turn"
              className="analysis-mini-select"
              value={scanTurnHint}
              onChange={(e) => setScanTurnHint(e.target.value as 'auto' | 'w' | 'b')}
              aria-label="Ko je na potezu na slici"
              title="Ko je na potezu u poziciji sa slike"
            >
              <option value="auto">Potez: Auto</option>
              <option value="w">Beli na potezu</option>
              <option value="b">Crni na potezu</option>
            </select>
          </div>

          <div className="analysis-hint-note">
            Savet: nalepi screenshot sa <strong>Ctrl+V</strong> ili otvori <strong>✎ Uredi tablu</strong> da ručno postaviš poziciju.
          </div>

          {fenFeedback && (
            <div
              className={`analysis-feedback ${fenFeedback.ok ? 'ok' : 'err'}`}
              role="status"
            >
              {fenFeedback.text}
            </div>
          )}

          {imageStatus.error && (
            <div className="analysis-feedback err" role="alert">
              {imageStatus.error}
            </div>
          )}

          {!imageStatus.error && imageStatus.status && (
            <div className="analysis-feedback ok" role="status">
              <strong>{confidenceLabel}:</strong> {imageStatus.status}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
