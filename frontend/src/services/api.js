const BASE_URL = 'http://localhost:8000';

export async function uploadComic(file) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData
    });

    if (!res.ok) {
        // parse any backend JSON error
        const err = await res.json().catch(() => ({
            detail: 'Upload failed'
        }));

        // throw it so that the react component can catch and display it
        throw new Error(err.detail || 'Upload failed');
    }

    return res.json(); // should return the job_id, filename, image_url, width and height
}

export async function detectBubbles(jobId, filename) {
    const res = await fetch(`${BASE_URL}/api/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Translates React payload to match FastAPI Pydantic DetectRequest schema
        body: JSON.stringify({ job_id: jobId, filename })
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({
            detail: "Detection failed"
        }));

        throw new Error(err.detail || "Detection failed");
    }

    return res.json(); 
}

export async function fetchLanguages() {
    const res = await fetch(`${BASE_URL}/api/languages`);

    if (!res.ok) {
        throw new Error('Could not load languages');
    }

    return res.json(); // { languages: [{ code, label, flag }] }
}

export async function translateBubbles(jobId, targetLanguage, bubbles) {
    const res = await fetch(`${BASE_URL}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            job_id: jobId,
            target_language: targetLanguage,
            bubbles
        })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Translation failed' }));
        throw new Error(err.detail || 'Translation failed');
    }
    return res.json();  // { bubbles: [{...bubbles, translated_text}] }
}

// utility function to resolve relative image paths to absolute backend URL
export function getImageURL(path) {
    return `${BASE_URL}${path}`;
}