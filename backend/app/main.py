from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import os
from pathlib import Path

from app.routers import upload, process, translate, render
from app.config import settings

load_dotenv()

# ensure that the storage directories exist on server startup
# this makes sure that "directory not found" errors don't occur on the first upload
Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
Path(settings.output_dir).mkdir(parents=True, exist_ok=True)

app = FastAPI(title="ComicLingo API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins during development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# connects the modular router to the main app
app.include_router(upload.router)
app.include_router(process.router)
app.include_router(translate.router)
app.include_router(render.router)

app.mount("/api/outputs", StaticFiles(directory=settings.output_dir), name="outputs")

@app.get("/health")
def health():
    return {"status": "ok", "service": "comiclingo-api"}