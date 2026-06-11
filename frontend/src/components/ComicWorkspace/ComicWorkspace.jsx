import styles from './ComicWorkspace.module.css';
import BubbleOverlay from './BubbleOverlay';
import TranslationPanel from '../TranslationPanel/TranslationPanel';
import LanguageSelector from '../LanguageSelector/LanguageSelector';
import { getImageURL } from '../../services/api';
import { SearchIcon, TranslateIcon, DownloadIcon, CheckIcon, ErrorIcon } from '../icons/Icons';

export default function ComicWorkspace({
  job,
  detection,
  bubbles,
  selectedId,
  targetLanguage,
  translations,
  translatedBubbles,
  renderResult,
  isDetecting,
  isTranslating,
  isRendering,
  detectError,
  translateError,
  renderError,
  warning,
  onDetect,
  onTranslate,
  onRender,
  onSelect,
  onUpdateText,
  onUpdateTranslated,
  onRemove,
  onLanguageChange,
  onShowResult
}) {
  // derived state to check if we should render post-detection UI
  const hasDetection = bubbles.length > 0;
  const hasTranslations = Object.keys(translations).length > 0;
  const canTranslate = hasDetection && !!targetLanguage && !isDetecting;
  const hasRender = !!renderResult;
  const canRender = hasTranslations && !isDetecting && !isTranslating;
  const anyError = detectError || translateError || renderError;
  const busy = isDetecting || isTranslating || isRendering;

  return (
    <div className={styles.shell}>
      <div className={styles.canvasCol}>

        <div className={styles.canvasHeader}>
          <div className={styles.fileInfo}>
            <span className={styles.filename}>{job.filename}</span>
            <span className={styles.dims}>{job.width} × {job.height}px</span>
            {hasDetection    && <span className={styles.pill}>{bubbles.length} bubbles</span>}
            {hasTranslations && <span className={styles.pillGreen}>✓ Translated</span>}
            {hasRender       && <span className={styles.pillAccent}>✓ Rendered</span>}
          </div>
          <span className={styles.jobId}>Job: {job.job_id.slice(0, 8)}…</span>
        </div>

        <div className={styles.canvasArea}>
          <div className={styles.imageWrap}>
            <img
              src={getImageUrl(job.image_url)}
              alt="Uploaded comic page"
              className={styles.comicImage}
            />
            {hasDetection && (
              <BubbleOverlay
                bubbles={bubbles}
                imageNaturalWidth={detection.image_width}
                imageNaturalHeight={detection.image_height}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>

          <button
            className={`${styles.toolBtn} ${!hasDetection ? styles.active : ''}`}
            onClick={onDetect}
            disabled={busy}
          >
            {isDetecting
              ? <><Spinner />Detecting…</>
              : hasDetection
                ? <><CheckIcon />Re-detect</>
                : <><SearchIcon />Detect Bubbles</>}
          </button>

          <Divider />

          <LanguageSelector
            value={targetLanguage}
            onChange={onLanguageChange}
            disabled={!hasDetection || busy}
          />
          <button
            className={`${styles.toolBtn} ${canTranslate && !hasTranslations ? styles.active : ''}`}
            onClick={onTranslate}
            disabled={!canTranslate || isTranslating}
          >
            {isTranslating
              ? <><Spinner />Translating…</>
              : hasTranslations
                ? <><CheckIcon />Re-translate</>
                : <><TranslateIcon />Translate</>}
          </button>

          <Divider />

          <button
            className={`${styles.toolBtn} ${canRender && !hasRender ? styles.active : ''}`}
            onClick={onRender}
            disabled={!canRender || isRendering}
          >
            {isRendering
              ? <><Spinner />Rendering…</>
              : hasRender
                ? <><CheckIcon />Re-render</>
                : <><PaintIcon />Render Comic</>}
          </button>

          {hasRender && (
            <button
              className={`${styles.toolBtn} ${styles.downloadBtn}`}
              onClick={onShowResult}
            >
              <EyeIcon />View & Download
            </button>
          )}
        </div>

        {anyError && (
          <div className={styles.errorBanner}>
            <ErrorIcon />{anyError}
          </div>
        )}
      </div>

      {hasDetection && (
        <TranslationPanel
          bubbles={bubbles}
          selectedId={selectedId}
          translations={translations}
          hasTranslations={hasTranslations}
          warning={warning}
          onSelect={onSelect}
          onUpdateText={onUpdateText}
          onUpdateTranslated={onUpdateTranslated}
          onRemove={onRemove}
        />
      )}
    </div>
  );
}

// Shared icon components 
const sv = { width:15, height:15, viewBox:"0 0 24 24", fill:"none", stroke:"currentColor", strokeWidth:2, strokeLinecap:"round" };
const SearchIcon    = () => <svg {...sv}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
const TranslateIcon = () => <svg {...sv}><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="m2 5 3 3"/><path d="m18 16 2 2"/><path d="m14 19 6-6-3-3"/></svg>;
const PaintIcon     = () => <svg {...sv}><path d="M2 13.5V20h6.5l9.86-9.86-6.5-6.5L2 13.5z"/><path d="m18.5 2.5 3 3"/></svg>;
const CheckIcon     = () => <svg {...sv}><polyline points="20 6 9 17 4 12"/></svg>;
const EyeIcon       = () => <svg {...sv}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const ErrorIcon     = () => <svg {...sv}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const Divider       = () => <div style={{ width:1, height:24, background:'var(--border)', flexShrink:0 }} />;
const Spinner       = () => <div style={{ width:13, height:13, border:'1.5px solid rgba(255,255,255,0.25)', borderTopColor:'currentColor', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />;