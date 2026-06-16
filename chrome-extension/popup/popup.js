const LANGUAGES = [
    { code: 'nigerian_pidgin', label: 'Nigerian Pidgin', flag: '🇳🇬'},
    { code: 'yoruba',          label: 'Yoruba',          flag: '🇳🇬'},
    { code: 'swahili',         label: 'Swahili',         flag: '🌍'},
    { code: 'igbo',            label: 'Igbo',            flag: '🇳🇬'},
    { code: 'hausa',           label: 'Hausa',           flag: '🇳🇬'},
    { code: 'french',          label: 'French',          flag: '🇫🇷'},
    { code: 'spanish',         label: 'Spanish',         flag: '🇪🇸'},
    { code: 'portuguese',      label: 'Portuguese',      flag: '🇧🇷'},
    { code: 'arabic',          label: 'Arabic',          flag: '🇸🇦'},
    { code: 'japanese',        label: 'Japanese',        flag: '🇯🇵'},
];

const $ = id => document.getElementById(id);

// populate language select
const sel = $('lang-select');

LANGUAGES.forEach(({ code, label, flag }) => {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = `${flag} ${label}`;
    sel.appendChild(opt);
});

// load saved settings
chrome.storage.sync.get(['enabled', 'targetLanguage', 'apiEndpoint'], (stored) => {
    const enabled = stored.enabled ?? false;
    const lang = stored.targetLanguage ?? 'nigerian_pidgin';
    const endpoint = stored.apiEndpoint ?? 'http://localhost:8000';

    $('enabled-toggle').checked = enabled;
    setEnabledUI(enabled);
    sel.value = lang;
    $('endpoint-input').value = endpoint;

    checkAPI(endpoint); // initial health check on popup load
});

// toggle
$('enabled-toggle').addEventListener('change', (e) => {
  const enabled = e.target.checked;
  chrome.storage.sync.set({ enabled });
  setEnabledUI(enabled);
});

function setEnabledUI(enabled) {
  $('enabled-label').textContent = enabled ? 'Extension enabled' : 'Extension disabled';
  $('enabled-label').style.color = enabled ? '#f5a623' : '#f0ede8';
}

// language change
sel.addEventListener('change', (e) => {
  chrome.storage.sync.set({ targetLanguage: e.target.value });
  // notify content scripts on the active tab to clear their cache
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'SETTINGS_CHANGED' })
        .catch(() => {}); // Tab may not have content script
    }
  });
});

// save the endpoint
$('save-endpoint').addEventListener('click', () => {
  const endpoint = $('endpoint-input').value.trim().replace(/\/$/, '');
  if (!endpoint) return;

  chrome.storage.sync.set({ apiEndpoint: endpoint }, () => {
    $('save-feedback').textContent = '✓ Saved';
    setTimeout(() => { $('save-feedback').textContent = ''; }, 2000);
    checkAPI(endpoint);

    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'SETTINGS_CHANGED' }).catch(() => {});
      }
    });
  });
});

// api health check
function checkAPI(endpoint) {
  setStatus('checking', 'Checking connection…');

  chrome.runtime.sendMessage({ type: 'PING_API', endpoint }, (res) => {
    if (chrome.runtime.lastError) {
      setStatus('disconnected', 'Cannot reach background worker');
      return;
    }
    if (res?.ok) {
      const host = new URL(endpoint).host;
      setStatus('connected', `Connected · ${host}`);
    } else {
      setStatus('disconnected', `Unreachable · ${endpoint}`);
    }
  });
}

function setStatus(state, text) {
  const dot  = $('status-dot');
  const label = $('status-text');
  dot.className = `dot ${state}`;
  label.textContent = text;
}
