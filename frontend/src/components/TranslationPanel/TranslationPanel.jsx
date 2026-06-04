import styles from './TranslationPanel.module.css';
import { BUBBLE_COLORS } from '../../shared/constants';

export default function TranslationPanel({
    bubbles,
    selectedId,
    translations,
    onSelect,
    onUpdateText,
    onUpdateTranslated,
    onRemove,
    warning,
    hasTranslations
}) {
    if (!bubbles.length) return null;  // hide panel entirely if there are no bubbles detected yet

    return (
        <aside className={styles.panel}>
            <div className={styles.header}>
                <span className={styles.title}>Speech Bubbles</span>
                <span className={styles.count}>{bubbles.length}</span>
            </div>
            
            {/* conditionally render backend warnings like fallback errrors from OpenCV */}
            {warning && (
                <div className={styles.warning}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                    {warning}
                </div>
            )}

            <div className={styles.list}>
                {bubbles.map((bubble, i) => {
                    const color = BUBBLE_COLORS[i % BUBBLE_COLORS.length];
                    const isSelected = bubble.id === selectedId;
                    const translated = translations[bubble.id];

                    return (
                        <div
                            key={bubble.id}
                            className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}
                            // pass the dynamic color to CSS a local custom property
                            style={{ '--bubble-color': color }}
                            // toggle selection on click
                            onClick={() => onSelect(isSelected ? null : bubble.id)}
                        >
                            <div className={styles.cardHeader}>
                                <span className={styles.bubbleNum} style={{ background: color, color: '#000' }}>
                                    {i + 1}
                                </span>
                                <span className={styles.confidence}>
                                    {Math.round(bubble.confidence * 100)}% confidence
                                </span>
                                <button
                                    className={styles.removeBtn}
                                    onClick={(e) => {
                                        e.stopPropagation(); // prevents card from toggling selection when deleting
                                        onRemove(bubble.id);
                                    }}
                                    title="Remove this bubble"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Original text */}
                            <div className={styles.fieldLabel}>Original</div>
                            <textarea
                                className={styles.textArea}
                                value={bubble.text}
                                onChange={(e) => onUpdateText(bubble.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                rows={2}
                                placeholder="Extracted text..."
                            />

                            {/* Translated Text should show only after translation */}
                            {hasTranslations && (
                                <>
                                <div className={styles.fieldLabel} style={{ color }}>
                                    Translated
                                </div>
                                <textarea
                                    className={`${styles.textArea} ${styles.translatedArea}`}
                                    style={{ borderColor: `${color}40` }}
                                    value={translated || ''}
                                    onChange={(e) => onUpdateTranslated(bubble.id, e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    rows={2}
                                    placeholder={translated === undefined ? 'Pending…' : ''}
                                />
                                </>
                            )}
                            
                            <div className={styles.coords}>
                                {bubble.x},{bubble.y} · {bubble.width}×{bubble.height}px
                            </div>
                        </div>
                    );
                })}
            </div>
        </aside>
    );
}