import { useState, useCallback } from 'react';
import { uploadComic, detectBubbles, translateBubbles, renderComic } from '../api'

export function useComicProcessor() {
    const [job, setJob] = useState(null);
    const [detection, setDetection] = useState(null);
    const [bubbles, setBubbles] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [targetLanguage, setTargetLanguage] = useState('');

    // per bubble translated text map
    const [translations, setTranslations] = useState({});
    const [translatedBubbles, setTranslatedBubbles] = useState([]);

    const [renderResult, setRenderResult] = useState(null); // { output_url, original_url }
    const [showResult, setShowResult] = useState(false) // controls ResultViewer

    const [isUploading, setIsUploading] = useState(false);
    const [isDetecting, setIsDetecting] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const [isRendering, setIsRendering] = useState(false);

    const [uploadError, setUploadError] = useState('');
    const [detectError, setDetectError] = useState('');
    const [translateError, setTranslateError] = useState('');
    const [renderError, setRenderError] = useState('');
    const [warning, setWarning] = useState('');

    const handleUpload = useCallback(async (file) => {
        setIsUploading(true);
        setUploadError('');  // reset previous detection state on new upload
        setDetection(null);
        setBubbles([]);
        setTranslations({});
        setTranslatedBubbles([]);
        setRenderResult(null);
        setSelectedId(null);

        try {
            const result = await uploadComic(file);
            setJob(result);
        }
        catch (err) {
            setUploadError(err.message);
        }
        finally {
            setIsUploading(false);
        }
    }, []);

    const handleDetect = useCallback(async () => {
        if (!job) {    // guard clause to prevent calls without a job
            return;
        }

        setIsDetecting(true);
        setDetectError('');
        setWarning('');
        setTranslations({});
        setTranslatedBubbles([]);
        setRenderResult(null);
        setSelectedId(null);

        try {
            const result = await detectBubbles(job.job_id, job.filename);
            setDetection(result);
            setBubbles(result.bubbles);

            // capture and display warnings 
            if (result.warning) {
                setWarning(result.warning);
            }
        }
        catch (err) {
             setDetectError(err.message);   
        }
        finally {
            setIsDetecting(false);
        }
    }, [job]);

    const handleTranslate = useCallback(async () => {
        if (!job || !bubbles.length || !targetLanguage) return;
        setIsTranslating(true);
        setTranslateError('');
        setRenderResult(null);

        try {
            const result = await translateBubbles(job.job_id, targetLanguage, bubbles);
            
            // build a lookup map for quick access in the panel
            const map = {};
            result.bubbles.forEach(b => {
                map[b.id] = b.translated_text;
            });
            setTranslations(map);
            setTranslatedBubbles(result.bubbles);
        }
        catch (err) {
            setTranslateError(err.message);
        }
        finally {
            setIsTranslating(false);
        }
    }, [job, bubbles, targetLanguage]);

    const handleRender = useCallback(async () => {
        if (!job || !translatedBubbles.length) return;
        setIsRendering(true);
        setRenderError('');

        try {
            const result = await renderComic(job.job_id, targetLanguage, translatedBubbles);
            setRenderResult(result);
            setShowResult(true);
        }
        catch (err) {
            setRenderError(err.message);
        } 
        finally {
            setIsRendering(false);
        }
    }, [job, targetLanguage, translatedBubbles]);

    // function for user to tweak the detected boxes
    const updateBubbleText = useCallback((id, newText) => {
        setBubbles(prev => prev.map(b => b.id === id ? { ...b, text: newText } : b));
    }, []);

    const updateTranslatedText = useCallback((id, newText) => {
        setTranslations(prev => ({...prev, [id]: newText }));
        setTranslatedBubbles(prev =>
            prev.map(b => b.id === id ? { ...b, translated_text: newText } : b)
        );
    }, []);

    const removeBubble = useCallback((id) => {
        setBubbles(prev => prev.filter(b => b.id !== id));
        setTranslatedBubbles(prev => prev.filter(b => b.id !== id));
        setTranslations(prev => { const n = { ...prev }; delete n[id]; return n; });
        setSelectedId(null);
    }, []);

    const reset = useCallback(() => {
        // clears all states to a fresh session
        setJob(null);
        setDetection(null);
        setBubbles([]);
        setTranslations({});
        setTranslatedBubbles([]);
        setRenderResult(null);
        setShowResult(false);
        setSelectedId(null);
        setTargetLanguage('');
        setUploadError('');
        setDetectError('');
        setTranslateError('');
        setWarning('');
    }, []);

    return {
        // States
        job,
        detection,
        bubbles,
        selectedId,
        targetLanguage,
        translations,
        translatedBubbles,
        renderResult,
        showResult,
        isUploading,
        isDetecting,
        isTranslating,
        uploadError,
        detectError,
        translateError,
        renderError,
        warning,

        // Actions
        handleUpload,
        handleDetect,
        handleTranslate,
        handleRender,
        updateBubbleText,
        updateTranslatedText,
        removeBubble,
        setSelectedId,
        setTargetLanguage,
        setShowResult,
        reset
    };
}