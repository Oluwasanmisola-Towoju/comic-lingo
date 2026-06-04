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
  isDetecting,
  isTranslating,
  detectError,
  translateError,
  warning,
  onDetect,
  onTranslate,
  onSelect,
  onUpdateText,
  onUpdateTranslated,
  onRemove,
  onLanguageChange
}) {
  // derived state to check if we should render post-detection UI
  const hasDetection = bubbles.length > 0;
  const hasTranslations = Object.keys(translations).length > 0;
  const canTranslate = hasDetection && !!targetLanguage && !isDetecting;

  return (
    <div className={styles.shell}>
      {/* Canvas area to the left side */}
      <div className={styles.canvasCol}>
        <div className={styles.canvasHeader}>
          <div className={styles.fileInfo}>
            <span className={styles.filename}>{job.filename}</span>
            <span className={styles.dims}>{job.width} × {job.height}px</span>
            {hasDetection && (
              <span className={styles.bubbleCount}>{bubbles.length} bubbles</span>
            )}
            {hasTranslations && (
              <span className={styles.translatedBadge}>✓ Translated</span>
            )}
          </div>
          <span className={styles.jobId}>Job: {job.job_id.slice(0, 8)}…</span>
        </div>

        <div className={styles.canvasArea}>
          <div className={styles.imageWrap}>
            <img
              src={getImageURL(job.image_url)}
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

        {/* toolbar pinned to bottom */}
        <div className={styles.toolbar}>
          <button
            className={`${styles.toolBtn} ${hasDetection ? styles.toolBtnDone : styles.toolBtnActive}`}
            onClick={onDetect}
            disabled={isDetecting || isTranslating}
          >
            {isDetecting ? (
              <>
                <div className={styles.btnSpinner} />
                Detecting…
              </>
            ) : hasDetection ? (
              <>
                <CheckIcon />Re-detect
              </>
            ) : (
              <>
                <SearchIcon />Detect Bubbles
              </>
            )}
          </button>

          <div className={styles.divider} />

          {/* Language and Translate */}
          <LanguageSelector
            value={targetLanguage}
            onChange={onLanguageChange}
            disabled={!hasDetection || isDetecting || isTranslating}
          />

          <button
            className={`${styles.toolBtn} ${canTranslate && !hasTranslations ? styles.toolBtnActive : ''}`}
            onClick={onTranslate}
            disabled={!canTranslate || isTranslating}
          >
            {isTranslating ? (
              <><div className={styles.btnSpinner} />Translating…</>
            ) : hasTranslations ? (
              <><CheckIcon />Re-translate</>
            ) : (
              <><TranslateIcon />Translate</>
            )}
          </button>

          <div className={styles.divider} />

          <button className={styles.toolBtn} disabled title="Coming in Next Phase">
            <DownloadIcon />Download
          </button>
        </div>

        {(detectError || translateError) && (
          <div className={styles.errorBanner}>
            <ErrorIcon />
            {detectError || translateError}
          </div>
        )}
      </div>

      {/* Side panel is only visible after detection at the right side */}
      {hasDetection && (
        <TranslationPanel
          bubbles={bubbles}
          selectedId={selectedId}
          translations={translations}
          hasTranslations={hasTranslations}
          onSelect={onSelect}
          onUpdateText={onUpdateText}
          onUpdateTranslated={onUpdateTranslated}
          onRemove={onRemove}
          warning={warning}
        />
      )}
    </div>
  );
}
