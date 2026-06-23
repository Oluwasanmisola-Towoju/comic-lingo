# ◈ ComicLingo

An AI-powered translation pipeline designed specifically for comic books, webtoons, and manga. ComicLingo automatically detects speech bubbles, extracts text using OCR, translates it into various global and African languages (preserving local slang and emotional tone), intelligently inpaints the background to erase the original text, and renders the translated text back onto the page using authentic comic typography.

<img width="255" height="260" alt="image" src="https://github.com/user-attachments/assets/7527fba1-82b1-40c4-9c1f-2b946da52b4f" />


## Key Features

* **Advanced Computer Vision:** Utilizes Google Cloud Vision for highly accurate OCR and OpenCV for bounding box detection and dynamic background inpainting.
* **Context-Aware AI Translation:** Powered by OpenAI (GPT-4o-mini), engineered with custom system prompts to preserve emotional intensity, comic brevity, and authentic local slang (e.g., Nigerian Pidgin, Yoruba, Swahili).
* **Seamless Text Rendering:** Uses Pillow (PIL) and dynamic text-wrapping algorithms to perfectly center and draw translated text inside bubbles using the iconic `Bangers` font, complete with readability strokes.
* **Interactive React Workspace:** A premium, dark-mode desktop UI featuring interactive SVG bounding boxes, a side-by-side translation review panel, and a draggable Before/After image comparison slider.
* **Native Chrome Extension:** A deeply integrated browser extension utilizing the Shadow DOM and MutationObservers to instantly translate comic pages on live websites without breaking host CSS.
* **Optimized Architecture:** Features concurrent asynchronous API calls with rate-limit semaphores and MD5 caching to drastically reduce API costs and load times.

## Tech Stack

**Frontend:**
* React.js (Vite)
* CSS Modules
* ResizeObserver API (for scalable SVG overlays)

**Backend:**
* Python & FastAPI
* OpenCV (`cv2.INPAINT_TELEA`, thresholding, contour detection)
* Pillow (PIL) for graphics rendering
* Google Cloud Vision API
* OpenAI API (`gpt-4o-mini`)
* Pydantic 

**Chrome Extension:**
* Manifest V3
* Vanilla JavaScript (Content Scripts, Service Workers)
* Shadow DOM Encapsulation

## The Pipeline Architecture

1. **Upload / Intercept:** User uploads a page via the React UI, or the Chrome Extension intercepts an `<img>` tag on a live website.
2. **Detect (OCR):** The backend queries Google Cloud Vision to extract text and bounding boxes.
3. **Review:** The frontend maps absolute coordinates to the browser window, allowing users to manually correct OCR text before translation.
4. **Translate:** An `asyncio.Semaphore` manages concurrent requests to OpenAI, translating bubbles while respecting rate limits.
5. **Inpaint:** OpenCV analyzes pixel whiteness. Flat white bubbles are bucket-filled; complex artwork is reconstructed using TELEA inpainting.
6. **Render:** Pillow calculates optimal font sizing, line breaks, and bounding box centering to draw the new text.

## 🚀 Getting Started

### Prerequisites
* Python 3.9+
* Node.js v18+
* An OpenAI API Key
* A Google Cloud Platform account (with Vision API enabled)

### 1. Backend Setup
<img width="597" height="289" alt="image" src="https://github.com/user-attachments/assets/35247d56-d80f-4017-bc4b-7be362fcf4b4" />

```bash
# Navigate to backend
cd backend

# Create virtual environment and activate
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Environment Variables
cp .env.example .env
# Edit .env with your OPENAI_API_KEY and GOOGLE_CLOUD_CREDENTIALS path

# Add the Comic Font
# Download 'Bangers-Regular.ttf' and place it in backend/fonts/

# Start the FastAPI server
uvicorn app.main:app --reload --port 8000
```
### 2. Frontend Setup
<img width="905" height="936" alt="image" src="https://github.com/user-attachments/assets/cbc55002-39f0-4d36-b98e-36bd0ec7bac5" />

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev

# The application will be running at http://localhost:5173
```

### 3. Chrome Extension Setup
<img width="401" height="383" alt="image" src="https://github.com/user-attachments/assets/e4440a26-5a49-48f6-9e8b-c28dcc7e6d40" />

* Open Google Chrome and navigate to 'chrome://extensions/'
* Toggle 'Developer mode' ON at the top right corner
* Click 'Load unpacked' at the top left corner
* Select the 'chrome-extension' directory in this repo
* Ensure your local backend is running, click the extension icon, toggle it to 'ON', and start browsing webcomics!

### Supported Languages
African: Nigerian Pidgin 🇳🇬, Yoruba 🇳🇬, Igbo 🇳🇬, Hausa 🇳🇬, Swahili 🌍

Global: English, French 🇫🇷, Spanish 🇪🇸, Portuguese (BR) 🇧🇷, Arabic 🇸🇦, Japanese 🇯🇵

### Future Roadmap
[ ] Cloud Deployment: Host API on Render/Railway and frontend on Vercel.

[ ] Automated Cleanup: Implement cron jobs to clear storage/uploads and storage/outputs.

[ ] Chrome Web Store Release: Launch the extension publicly using a "Bring Your Own Key" (BYOK) model.

[ ] Switching completely to opensource models for both OCR (EasyOCR) and translation (YarnGPT)

Built with passion for all comic readers like me out there!
