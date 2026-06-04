import { useState, useEffect, useRef } from "react";
import { fetchLanguages } from "../../services/api";
import styles from './LanguageSelector.module.css';

export default function LanguageSelector({ value, onChange, disabled }) {
    const [languages, setLanguages] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const ref = useRef(null);

    // fetch languages on components mount
    useEffect(() => {
        fetchLanguages()
            .then(data => {
                setLanguages(data.languages);
                // auto-select the first language is none is currently selected
                if (!value && data.languages.length) {
                    onChange(data.languages[0].code);
                }
            })
            .finally(() => setLoading(false));
    }, [value, onChange]); // satisfies react hook linting

    useEffect(() => {
        const handler = (e) => {
            // if the click target is NOT inside the ref container, close the dropdown
            if (ref.current && !ref.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        
        // attach the listener immediately when the effect runs
        document.addEventListener('mousedown', handler);

        // clean up function for when the component unmounts
        return () => document.removeEventListener('mousedown', handler);
        
    }, []);

    const selected = languages.find(l => l.code === value);

    return (
        <div ref={ref} className={styles.wrapper}>
            <button
                className={`${styles.trigger} ${isOpen ? styles.open : ''}`}
                onClick={() => !disabled && setIsOpen(p => !p)}
                disabled={disabled || loading}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                {loading ? (
                <span className={styles.placeholder}>Loading languages…</span>
                ) : selected ? (
                <>
                    <span className={styles.flag}>{selected.flag}</span>
                    <span className={styles.label}>{selected.label}</span>
                </>
                ) : (
                <span className={styles.placeholder}>Select language</span>
                )}
                <svg className={`${styles.chevron} ${isOpen ? styles.chevronUp : ''}`}
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="6 9 12 15 18 9"/>
                </svg>
            </button>

        {isOpen && (
            <ul className={styles.dropdown} role="listbox">
            {languages.map(lang => (
                <li
                key={lang.code}
                role="option"
                aria-selected={lang.code === value}
                className={`${styles.option} ${lang.code === value ? styles.optionActive : ''}`}
                onClick={() => { onChange(lang.code); setIsOpen(false); }}
                >
                <span className={styles.flag}>{lang.flag}</span>
                <span className={styles.optionLabel}>{lang.label}</span>
                {lang.code === value && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12"/>
                    </svg>
                )}
                </li>
            ))}
            </ul>
        )}
        </div>
    );
}