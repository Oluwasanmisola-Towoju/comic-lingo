import styles from './ComicWorkspace.module.css';
import BubbleOverlay from './BubbleOverlay';
import TranslationPanel from '../TranslationPanel/TranslationPanel';
import LanguageSelector from '../LanguageSelector/LanguageSelector';
import { getImageURL } from '../../services/api';
import { SearchIcon, TranslateIcon, DownloadIcon, CheckIcon, ErrorIcon, PaintIcon, EyeIcon } from '../icons/Icons';

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
            {hasDetection && <span className={styles.pill}>{bubbles.length} bubbles</span>}
            {hasTranslations && <span className={styles.pillGreen}>✓ Translated</span>}
            {hasRender && <span className={styles.pillAccent}>✓ Rendered</span>}
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

// Utility components
const Divider = () => <div style={{ width: 1, height: 24, background: 'var(--border)', flexShrink: 0 }} />;
const Spinner = () => <div style={{ width: 13, height: 13, border: '1.5px solid rgba(255,255,255,0.25)', borderTopColor: 'currentColor', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />;