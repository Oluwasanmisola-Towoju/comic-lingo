import { useState, useRef, useCallback } from 'react';
import styles from './ResultViewer.module.css';
import { getImageURL } from '../../services/api';
import { DownloadIcon, CloseIcon, ArrowsIcon } from '../icons/Icons';

export default function ResultViewer({ originalUrl, outputUrl, onClose }) {
    const [sliderPos, setSliderPos] = useState(50);   // percent
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef(null);

    const updateSlider = useCallback((clientX) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const pct = Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100));
        setSliderPos(pct);
    }, []);

    const onMouseMove = useCallback((e) => {
        if (isDragging) updateSlider(e.clientX);
    }, [isDragging, updateSlider]);

    const onTouchMove = useCallback((e) => {
        if (isDragging) updateSlider(e.touches[0].clientX);
    }, [isDragging, updateSlider]);

    const startDrag = () => setIsDragging(true);
    const stopDrag = () => setIsDragging(false);

    const handleDownload = () => {
        const a = document.createElement('a');
        a.href = getImageURL(outputUrl);
        a.download = 'comiclingo-translated.jpg';
        a.target = '_blank';
        a.click();
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>

                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <span className={styles.title}>Result</span>
                        <span className={styles.hint}>Drag the slider to compare</span>
                    </div>
                    <div className={styles.headerActions}>
                        <button className={styles.downloadBtn} onClick={handleDownload}>
                            <DownloadIcon />
                            Download
                        </button>
                        <button className={styles.closeBtn} onClick={onClose}>
                            <CloseIcon />
                        </button>
                    </div>
                </div>

                {/* Comparison slider */}
                <div
                    ref={containerRef}
                    className={styles.compareArea}
                    onMouseMove={onMouseMove}
                    onMouseUp={stopDrag}
                    onMouseLeave={stopDrag}
                    onTouchMove={onTouchMove}
                    onTouchEnd={stopDrag}
                >
                    {/* After image shows full width, behind */}
                    <img
                        src={getImageURL(outputUrl)}
                        alt="Translated comic"
                        className={styles.image}
                        draggable={false}
                    />

                    {/* Before image is clipped to the left of the slider */}
                    <div
                        className={styles.beforeClip}
                        style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                    >
                        <img
                            src={getImageURL(originalUrl)}
                            alt="Original comic"
                            className={styles.image}
                            draggable={false}
                        />
                    </div>

                    {/* Labels */}
                    <span
                        className={styles.labelBefore}
                        style={{ opacity: sliderPos > 15 ? 1 : 0 }}
                    >
                        Before
                    </span>
                    <span
                        className={styles.labelAfter}
                        style={{ opacity: sliderPos < 85 ? 1 : 0 }}
                    >
                        After
                    </span>

                    {/* Slider handle */}
                    <div
                        className={`${styles.handle} ${isDragging ? styles.handleDragging : ''}`}
                        style={{ left: `${sliderPos}%` }}
                        onMouseDown={startDrag}
                        onTouchStart={startDrag}
                    >
                        <div className={styles.handleLine} />
                        <div className={styles.handleKnob}>
                            <ArrowsIcon />
                        </div>
                    </div>

                    {/* Invisible full-width range input for keyboard and accessibility */}
                    <input
                        type="range"
                        min="2" max="98"
                        value={sliderPos}
                        onChange={(e) => setSliderPos(Number(e.target.value))}
                        className={styles.rangeInput}
                        aria-label="Compare before and after"
                    />
                </div>

            </div>
        </div>
    );
}