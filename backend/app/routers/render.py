"""
Render Router
impaint -> render text -> save -> return URL
  Locates the original uploaded image.
  Runs inpainting across all bubble regions.
  Renders translated text into each inpainted bubble.
  Saves the result to storage/outputs/{job_id}_rendered.jpg.
  Returns URLs for both the original and rendered image (for comparison).
"""

from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List

from app.services.impainting_service import erase_text_from_bubbles
from app.services.rendering_service import render_translations, numpy_to_bytes
from app.config import settings

router = APIRouter(prefix="/api", tags=["render"])

class RenderBubble(BaseModel):
    id: str
    x: int
    y: int
    width: int
    height: int
    text: str
    translated_text: str
    confidence: float = 0.9

class RenderRequest(BaseModel):
    job_id: str
    target_language: str
    bubbles: List[RenderBubble]

class RenderResponse(BaseModel):
    job_id: str
    output_url: str
    original_url: str
    bubble_count: int
    skipped_count: int # bubbles with no tanslated text (skipped)

@router.post("/render", response_model=RenderResponse)
async def render(req: RenderRequest):
    if not req.bubbles:
        raise HTTPException(status_code=422, detail="No bubbles provided.")
    
    # Locate the source image
    upload_path = None
    for ext in [".jpg", ".jpeg", ".png", ".webp"]:
        candidate = Path(settings.upload_dir) / f"{req.job_id}{ext}"
        if candidate.exists():
            uplaod_path = candidate
            break
    
    if not upload_path:
        raise HTTPException(status_code=404, detail=f"No image for job_id: {req.job_id}")

    # Filter out bubbles with no translation 
    valid_bubbles   = [b for b in req.bubbles if b.translated_text.strip()]
    skipped_count   = len(req.bubbles) - len(valid_bubbles)

    if not valid_bubbles:
        raise HTTPException(
            status_code=422,
            detail="No bubbles have translated text. Run translation first."
        )

    # Inpainting 
    try:
        bubble_rects = [(b.x, b.y, b.width, b.height) for b in valid_bubbles]
        inpainted = erase_text_from_bubbles(str(upload_path), bubble_rects)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inpainting failed: {str(e)}")

    # Text rendering 
    try:
        bubble_dicts = [b.model_dump() for b in valid_bubbles]
        rendered = render_translations(inpainted, bubble_dicts)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text rendering failed: {str(e)}")

    # Save output 
    try:
        output_dir = Path(settings.output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        output_filename = f"{req.job_id}_rendered.jpg"
        output_path     = output_dir / output_filename

        image_bytes = numpy_to_bytes(rendered, fmt="JPEG")
        output_path.write_bytes(image_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save output: {str(e)}")

    return RenderResponse(
        job_id=req.job_id,
        output_url=f"/api/image/{output_filename}",
        original_url=f"/api/image/{upload_path.name}",
        bubble_count=len(valid_bubbles),
        skipped_count=skipped_count,
    )