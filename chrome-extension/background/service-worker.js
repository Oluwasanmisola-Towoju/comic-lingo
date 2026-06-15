const DEFAULTS = {
    enabled: false,
    targetLanguage: 'nigerian_pidgin',
    apiEndpoint: 'http://localhost:8000',
};

// set defaults on first install
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.get(Object.keys(DEFAULTS), (stored) => {
        const toSet = {};
        for (const [k, v] of Object.entries(DEFAULTS)) {
            if (stored[k] === undefined) toSet[k] = v;
        }
        if (Object.keys(toSet).length) chrome.storage.sync.set(toSet);
    });
});

// keep badge in sync with enabled state
chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    if (changes.enabled !== undefined) {
        _setBadge(changes.enabled.newValue);
    }
});

function _setBadge(enabled) {
    chrome.action.setBadgeText({ text: enabled ? 'ON' : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#f5a623' });
}

// Restore badge state service worker wake-up
chrome.storage.sync.get('enabled', ({ enabled }) => _setBadge(!!enabled));

// Proxy API health check to avoid CORS issues from popup context
chrome.runtime.onMessage.addListener(( msg, _sender, sendRespose ) => {
    if (msg.type === 'PING_API') {
        fetch(`${msg.endpoint}/health`)
            .then(r => r.json())
            .then(d => sendRespose({ ok: true, data: d }))
            .catch(e => sendRespose({ ok: false, error: e.message }));
        return true; // keep channel open for async response
    }
});