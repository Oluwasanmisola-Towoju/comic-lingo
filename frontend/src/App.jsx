import './styles/globals.css';
import UploadZone from './components/UploadZone/UploadZone';
import ComicWorkspace from './components/ComicWorkspace/ComicWorkspace';
import { useComicProcessor } from './hooks/useComicProcessor';
import styles from './App.module.css';

export default function App() {
  const p = useComicProcessor();

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>◈</span>
          <span className={styles.logoText}>ComicLingo</span>
        </div>
        <nav className={styles.nav}>
          {p.job && <button className={styles.resetBtn} onClick={p.reset}>← New Upload</button>}
          <span className={styles.badge}>Prototype v0.1</span>
        </nav>
      </header>

      <main className={styles.main}>
        {!p.job ? (
          <div className={styles.uploadView}>
            <div className={styles.heroText}>
              <h1 className={styles.title}>Translate comics<br />into any language.</h1>
              <p className={styles.subtitle}>
                Upload a comic page. AI detects the speech bubbles, extracts the text,
                translates it — then redraws it back into the original bubbles.
              </p>
            </div>
            {p.isUploading ? (
              <div className={styles.uploading}>
                <div className={styles.spinner} />
                <p>Uploading…</p>
              </div>
            ) : (
              <UploadZone onUpload={p.handleUpload} />
            )}
            {p.uploadError && <p className={styles.uploadError}>{p.uploadError}</p>}
          </div>
        ) : (
          <ComicWorkspace
            job={p.job}
            detection={p.detection}
            bubbles={p.bubbles}
            selectedId={p.selectedId}
            targetLanguage={p.targetLanguage}
            translations={p.translations}
            translatedBubbles={p.translatedBubbles}
            isDetecting={p.isDetecting}
            isTranslating={p.isTranslating}
            detectError={p.detectError}
            translateError={p.translateError}
            warning={p.warning}
            onDetect={p.handleDetect}
            onTranslate={p.handleTranslate}
            onSelect={p.setSelectedId}
            onUpdateText={p.updateBubbleText}
            onUpdateTranslated={p.updateTranslatedText}
            onRemove={p.removeBubble}
            onLanguageChange={p.setTargetLanguage}
          />
        )}
      </main>
    </div>
  );
}