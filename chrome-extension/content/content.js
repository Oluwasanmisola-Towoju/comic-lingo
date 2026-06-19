'use strict';

// Constants 
const MIN_IMG_WIDTH = 380;
const MIN_IMG_HEIGHT = 280;

const BUBBLE_COLORS = [
  '#f5a623', '#4ecdc4', '#a78bfa', '#f87171',
  '#34d399', '#60a5fa', '#fb923c', '#e879f9',
];

const SHADOW_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .container {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: visible;
    pointer-events: auto;
  }

  /* Translate badge — shown on first hover */
  .badge {
    position: absolute;
    top: 10px;
    right: 10px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: rgba(13,13,15,0.92);
    border: 1px solid rgba(245,166,35,0.5);
    border-radius: 20px;
    color: #f5a623;
    font-family: 'DM Sans', system-ui, sans-serif;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    pointer-events: all !important;
    backdrop-filter: blur(4px);
    transition: background 0.15s, transform 0.15s;
    white-space: nowrap;
    user-select: none;
    z-index: 10;
  }

  .badge:hover {
    background: rgba(245,166,35,0.18);
    transform: scale(1.03);
  }

  .badge.loading {
    color: #8a8880;
    border-color: rgba(255,255,255,0.15);
    cursor: default;
    pointer-events: none;
  }

  .badge.error {
    color: #f87171;
    border-color: rgba(248,113,113,0.4);
    cursor: default;
  }

  .badge-logo { font-size: 14px; }

  .spinner {
    width: 12px;
    height: 12px;
    border: 1.5px solid rgba(255,255,255,0.15);
    border-top-color: #f5a623;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* SVG bubble overlay */
  .bubbles-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
    pointer-events: none;
  }

  .bubble-group {
    pointer-events: all;
    cursor: pointer;
  }

  .bubble-fill {
    transition: fill-opacity 0.15s;
  }

  .bubble-border {
    transition: stroke-width 0.15s;
  }

  /* Tooltip — comic speech bubble */
  .tooltip {
    position: absolute;
    max-width: 220px;
    background: #fff;
    color: #0d0d0f;
    border: 2px solid #0d0d0f;
    border-radius: 12px;
    padding: 8px 12px;
    font-family: 'Bangers', 'DM Sans', system-ui, sans-serif;
    font-size: 14px;
    line-height: 1.4;
    pointer-events: none;
    z-index: 20;
    box-shadow: 3px 3px 0 #0d0d0f;
    opacity: 0;
    transition: opacity 0.1s;
    word-break: break-word;
  }

  .tooltip.visible { opacity: 1; }

  /* Tail of the speech bubble */
  .tooltip::before {
    content: '';
    position: absolute;
    bottom: -10px;
    left: 20px;
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 4px solid transparent;
    border-top: 10px solid #0d0d0f;
  }

  .tooltip::after {
    content: '';
    position: absolute;
    bottom: -7px;
    left: 22px;
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 3px solid transparent;
    border-top: 8px solid #fff;
  }

  /* Dismiss button */
  .dismiss {
    position: absolute;
    top: 10px;
    left: 10px;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: rgba(13,13,15,0.85);
    border: 1px solid rgba(255,255,255,0.15);
    color: #8a8880;
    font-size: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    pointer-events: all;
    transition: color 0.15s, background 0.15s;
    backdrop-filter: blur(4px);
    z-index: 10;
    line-height: 1;
  }

  .dismiss:hover { color: #f0ede8; background: rgba(248,113,113,0.25); }

  /* Bubble count badge */
  .count-chip {
    position: absolute;
    bottom: 10px;
    right: 10px;
    padding: 3px 10px;
    background: rgba(13,13,15,0.85);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 99px;
    color: #8a8880;
    font-family: monospace;
    font-size: 11px;
    pointer-events: none;
    backdrop-filter: blur(4px);
  }
`;

// Settings (kept in sync with storage) 
let settings = {
  enabled: false,
  targetLanguage: 'nigerian_pidgin',
  apiEndpoint: 'http://localhost:8000',
};

let settingsLoaded = false;

chrome.storage.sync.get(
  ['enabled', 'targetLanguage', 'apiEndpoint'],
  (stored) => {
    settings.enabled = stored.enabled ?? true; // Default to enabled
    settings.targetLanguage = stored.targetLanguage ?? 'nigerian_pidgin';
    settings.apiEndpoint = stored.apiEndpoint ?? 'http://localhost:8000';
    settingsLoaded = true;

    // Scan images after settings are loaded
    scanImages();
  }
);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  if (changes.enabled) settings.enabled = changes.enabled.newValue;
  if (changes.targetLanguage) settings.targetLanguage = changes.targetLanguage.newValue;
  if (changes.apiEndpoint) settings.apiEndpoint = changes.apiEndpoint.newValue;
});

// Clear cache when settings change (different language selected)
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'SETTINGS_CHANGED') {
    resultCache.clear();
    // Remove all active overlays so they reprocess with new settings
    activeOverlays.forEach((state) => state.host?.remove());
    activeOverlays.clear();
  }
});

// State 

// Map of img element to overlay state
const activeOverlays = new Map();

// Cache: `${imgSrc}::${language}` → { bubbles, imageWidth, imageHeight }
const resultCache = new Map();

// Cache configuration
const CACHE_MAX_SIZE = 100; // Prevent unbounded memory growth
const CACHE_TTL_MS = 3600000; // 1 hour TTL
const API_TIMEOUT_MS = 45000; // 45 second timeout for API calls

// Evict oldest cache entries when limit reached
function addToCache(key, value) {
  if (resultCache.size >= CACHE_MAX_SIZE) {
    const firstKey = resultCache.keys().next().value;
    resultCache.delete(firstKey);
  }
  resultCache.set(key, { data: value, timestamp: Date.now() });
}

function getFromCache(key) {
  const entry = resultCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    resultCache.delete(key);
    return null;
  }
  return entry.data;
}

// Periodically clear expired cache entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of resultCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      resultCache.delete(key);
    }
  }
}, 300000); // Check every 5 minutes

// Image qualification 

function qualifies(img) {
  if (!img.src || img.src.startsWith('data:')) return false;
  if (img.naturalWidth < MIN_IMG_WIDTH) return false;
  if (img.naturalHeight < MIN_IMG_HEIGHT) return false;
  return true;
}

// Attach listeners to an image 

function attach(img) {
  if (img.dataset.clAttached) return;
  img.dataset.clAttached = '1';

  img.addEventListener('mouseenter', () => onEnter(img));
  img.addEventListener('mouseleave', () => onLeave(img));
}

function onEnter(img) {
  if (!settings.enabled) return;
  if (!qualifies(img)) return;

  const state = activeOverlays.get(img);

  if (!state) {
    // First hover to show translate badge
    showBadge(img);
    return;
  }

  if (state.status === 'ready') {
    positionHost(state.host, img);
    state.host.style.display = 'block';
  }
}

function onLeave(img) {
  const state = activeOverlays.get(img);
  if (state?.host) state.host.style.display = 'none';
}

// Badge 

function showBadge(img) {
  // Reuse existing state or create new
  let state = activeOverlays.get(img);
  if (!state) {
    state = { status: 'badge', host: null, shadow: null };
    activeOverlays.set(img, state);
  }

  if (state.host) {
    positionHost(state.host, img);
    state.host.style.display = 'block';
    return;
  }

  // Create the host element with Shadow DOM
  const host = document.createElement('div');
  host.className = 'comiclingo-host';
  const shadow = host.attachShadow({ mode: 'open' });

  shadow.innerHTML = `
    <style>${SHADOW_STYLES}</style>
    <div class="container">
      <div class="badge" id="badge">
        <span class="badge-logo">◈</span>
        <span id="badge-label">Translate</span>
      </div>
    </div>
  `;

  state.host = host;
  state.shadow = shadow;
  state.processing = false;
  state.clickHandler = () => processImage(img, state); // Store direct reference

  document.body.appendChild(host);
  positionHost(host, img);

  // Add hover listeners to the host so badge stays visible when hovering over it
  host.addEventListener('mouseenter', () => {
    host.style.display = 'block';
  });
  host.addEventListener('mouseleave', () => {
    host.style.display = 'none';
  });

  // Handle badge click to start processing
  const badgeEl = shadow.getElementById('badge');
  if (badgeEl) {
    badgeEl.addEventListener('click', state.clickHandler);
  }
}

// Process pipeline 

async function processImage(img, state) {
  // Prevent concurrent processing on same image
  if (state.processing) return;
  state.processing = true;

  const cacheKey = `${img.src}::${settings.targetLanguage}`;

  const cached = getFromCache(cacheKey);
  if (cached) {
    state.processing = false;
    renderBubbles(img, state, cached);
    return;
  }

  // Create abort controller for this processing task
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  state.abortController = controller;

  // Show loading state in badge
  setState(state, 'loading');
  const badge = state.shadow?.getElementById('badge');
  if (!badge) {
    state.processing = false;
    clearTimeout(timeoutId);
    return;
  }
  badge.className = 'badge loading';
  badge.textContent = '';
  badge.innerHTML = `<div class="spinner"></div><span>Processing…</span>`;

  try {
    if (controller.signal.aborted) throw new Error('Processing cancelled.');

    // Send image URL to backend - backend downloads it in order to avoid CORS
    // This is more reliable than trying to extract CORS-restricted images on client
    const uploadUrlRes = await fetch(`${settings.apiEndpoint}/api/upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: img.src,
        referrer: window.location.href
      }),
      signal: controller.signal,
    });

    if (!uploadUrlRes.ok) {
      const errorData = await uploadUrlRes.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to download image from URL.');
    }

    let uploadData;
    try {
      uploadData = await uploadUrlRes.json();
      if (!uploadData.job_id || !uploadData.filename) throw new Error('Invalid response.');
    } catch (err) {
      throw new Error('Server response invalid.');
    }

    if (controller.signal.aborted) throw new Error('Processing cancelled.');

    // Detect 
    const detectRes = await fetch(`${settings.apiEndpoint}/api/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: uploadData.job_id, filename: uploadData.filename }),
      signal: controller.signal,
    });
    if (!detectRes.ok) throw new Error('Bubble detection failed.');

    let detectData;
    try {
      detectData = await detectRes.json();
      if (!detectData.bubbles || !Array.isArray(detectData.bubbles)) throw new Error('Invalid response.');
      if (!detectData.image_width || !detectData.image_height) throw new Error('Missing image dimensions.');
    } catch (err) {
      throw new Error('Detection response invalid.');
    }

    if (!detectData.bubbles.length) throw new Error('No speech bubbles found in image.');

    if (controller.signal.aborted) throw new Error('Processing cancelled.');

    // Translate 
    const translateRes = await fetch(`${settings.apiEndpoint}/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: uploadData.job_id,
        target_language: settings.targetLanguage,
        bubbles: detectData.bubbles,
      }),
      signal: controller.signal,
    });
    if (!translateRes.ok) throw new Error('Translation failed.');

    let translateData;
    try {
      translateData = await translateRes.json();
      if (!translateData.bubbles || !Array.isArray(translateData.bubbles)) throw new Error('Invalid response.');
    } catch (err) {
      throw new Error('Translation response invalid.');
    }

    const result = {
      bubbles: translateData.bubbles,
      imageWidth: detectData.image_width,
      imageHeight: detectData.image_height,
    };

    addToCache(cacheKey, result);
    state.processing = false;
    clearTimeout(timeoutId);
    renderBubbles(img, state, result);

  } catch (err) {
    state.processing = false;
    clearTimeout(timeoutId);
    setState(state, 'error');

    const b = state.shadow?.getElementById('badge');
    if (b) {
      b.className = 'badge error';
      b.textContent = '';
      const errorMsg = err.message || 'Processing failed. Please try again.';
      b.innerHTML = `<span class="badge-logo">◈</span><span>${CSS.escape(errorMsg)}</span>`;

      setTimeout(() => {
        if (b) {
          b.className = 'badge';
          b.textContent = '';
          b.innerHTML = `<span class="badge-logo">◈</span><span id="badge-label">Retry</span>`;
          b.removeEventListener('click', state.clickHandler);
          b.addEventListener('click', state.clickHandler);
        }
      }, 4000);
    }
  }
}

// Render bubble overlays 

function renderBubbles(img, state, result) {
  setState(state, 'ready');

  // Build SVG overlay inside the shadow DOM
  const container = state.shadow.querySelector('.container');

  // Clear any existing badge
  container.innerHTML = '';

  const rect = img.getBoundingClientRect();
  const scaleX = rect.width / result.imageWidth;
  const scaleY = rect.height / result.imageHeight;

  // Dismiss button
  const dismissBtn = document.createElement('div');
  dismissBtn.className = 'dismiss';
  dismissBtn.innerHTML = '✕';
  dismissBtn.addEventListener('click', () => {
    state.host.style.display = 'none';
    setState(state, 'dismissed');
  });
  container.appendChild(dismissBtn);

  // SVG layer
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('bubbles-svg');
  svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
  container.appendChild(svg);

  // Tooltip element (shared, repositioned per bubble)
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  container.appendChild(tooltip);

  // Bubble count chip
  const chip = document.createElement('div');
  chip.className = 'count-chip';
  chip.textContent = `${result.bubbles.length} bubbles`;
  container.appendChild(chip);

  // Render each bubble
  result.bubbles.forEach((bubble, i) => {
    const color = BUBBLE_COLORS[i % BUBBLE_COLORS.length];

    const rx = bubble.x * scaleX;
    const ry = bubble.y * scaleY;
    const rw = bubble.width * scaleX;
    const rh = bubble.height * scaleY;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.classList.add('bubble-group');

    // Fill
    const fill = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    fill.setAttribute('x', rx); fill.setAttribute('y', ry);
    fill.setAttribute('width', rw); fill.setAttribute('height', rh);
    fill.setAttribute('rx', '4');
    fill.setAttribute('fill', color);
    fill.setAttribute('fill-opacity', '0.10');
    fill.classList.add('bubble-fill');

    // Border
    const border = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    border.setAttribute('x', rx); border.setAttribute('y', ry);
    border.setAttribute('width', rw); border.setAttribute('height', rh);
    border.setAttribute('rx', '4');
    border.setAttribute('fill', 'none');
    border.setAttribute('stroke', color);
    border.setAttribute('stroke-width', '1.5');
    border.setAttribute('stroke-dasharray', '5 3');
    border.classList.add('bubble-border');

    // Index label
    const labelRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    labelRect.setAttribute('x', rx); labelRect.setAttribute('y', ry - 18);
    labelRect.setAttribute('width', '22'); labelRect.setAttribute('height', '18');
    labelRect.setAttribute('rx', '4'); labelRect.setAttribute('fill', color);

    const labelText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    labelText.setAttribute('x', rx + 11); labelText.setAttribute('y', ry - 5);
    labelText.setAttribute('text-anchor', 'middle');
    labelText.setAttribute('font-size', '11');
    labelText.setAttribute('font-weight', '700');
    labelText.setAttribute('font-family', 'system-ui, sans-serif');
    labelText.setAttribute('fill', '#000');
    labelText.textContent = i + 1;

    g.appendChild(fill);
    g.appendChild(border);
    g.appendChild(labelRect);
    g.appendChild(labelText);
    svg.appendChild(g);

    // Hover to show tooltip with translation
    const translatedText = bubble.translated_text || bubble.text || '';

    g.addEventListener('mouseenter', () => {
      fill.setAttribute('fill-opacity', '0.22');
      border.setAttribute('stroke-dasharray', 'none');
      border.setAttribute('stroke-width', '2');

      tooltip.textContent = translatedText;
      tooltip.classList.add('visible');

      // Position tooltip above the bubble, clamped to container
      let tipX = rx;
      let tipY = ry - 58;
      if (tipY < 0) tipY = ry + rh + 8;
      if (tipX + 220 > rect.width) tipX = rect.width - 228;
      tooltip.style.left = `${Math.max(4, tipX)}px`;
      tooltip.style.top = `${Math.max(4, tipY)}px`;
    });

    g.addEventListener('mouseleave', () => {
      fill.setAttribute('fill-opacity', '0.10');
      border.setAttribute('stroke-dasharray', '5 3');
      border.setAttribute('stroke-width', '1.5');
      tooltip.classList.remove('visible');
    });
  });

  positionHost(state.host, img);
  state.host.style.display = 'block';
}

// Positioning 

function positionHost(host, img) {
  const r = img.getBoundingClientRect();
  host.style.cssText = `
    position: absolute; 
    top: ${r.top + window.scrollY}px;
    left: ${r.left + window.scrollX}px;
    width: ${r.width}px;
    height: ${r.height}px;
    pointer-events: auto;
    z-index: 2147483647;
    display: block;
  `;
}

function setState(state, status) {
  state.status = status;
}

// Keep overlays aligned during scroll or resize
function updateAllPositions() {
  activeOverlays.forEach((state, img) => {
    if (state.host && state.host.style.display !== 'none') {
      positionHost(state.host, img);
    }
  });
}

window.addEventListener('scroll', updateAllPositions, { passive: true });
window.addEventListener('resize', updateAllPositions, { passive: true });

// Clean up overlays when images are removed from DOM
const imageObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
      mutation.removedNodes.forEach((node) => {
        // Check if removed node contains any tracked images
        if (node.nodeType === 1) { // Element node
          let imagesToRemove = [];
          if (node.tagName === 'IMG' && activeOverlays.has(node)) {
            imagesToRemove.push(node);
          }
          node.querySelectorAll?.('img').forEach((img) => {
            if (activeOverlays.has(img)) {
              imagesToRemove.push(img);
            }
          });

          imagesToRemove.forEach((img) => {
            const state = activeOverlays.get(img);
            if (state?.host) {
              state.host.remove();
              state.abortController?.abort();
            }
            activeOverlays.delete(img);
          });
        }
      });
    }
  }
});

imageObserver.observe(document.body, { childList: true, subtree: true });

// Observe DOM for new images (infinite scroll, SPAs) 

function scanImages() {
  if (!settingsLoaded) {
    // Wait a bit and retry if settings not loaded yet
    setTimeout(scanImages, 100);
    return;
  }

  document.querySelectorAll('img').forEach((img) => {
    if (img.complete && img.naturalWidth > 0) {
      attach(img);
    } else {
      img.addEventListener('load', () => attach(img), { once: true });
    }
  });
}

// Don't scan immediately, wait for settings to load (done in chrome.storage callback)
const observer = new MutationObserver(() => {
  if (settingsLoaded) {
    scanImages();
  }
});
observer.observe(document.body, { childList: true, subtree: true });