"""
Translates all bubble texts for a job.

Accepts the full list of bubble objects so the frontend only needs one
round trip to translate an entire comic page.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from app.services.translation_service import translate_batch, get_supported_languages
from app.models.schemas import BoundingBox

router = APIRouter(prefix="/api", tags=["translate"])


class TranslateRequest(BaseModel):
    job_id: str
    target_language: str
    bubbles: List[BoundingBox]


class TranslatedBubble(BoundingBox):
    translated_text: str
    target_language: str


class TranslateResponse(BaseModel):
    job_id: str
    target_language: str
    bubbles: List[TranslatedBubble]
    bubble_count: int
    cached_count: int       # how many results came from cache (useful for debugging)


class LanguageListResponse(BaseModel):
    languages: List[dict]


@router.get("/languages", response_model=LanguageListResponse)
def list_languages():
    """Returns all supported target languages for the frontend selector."""
    return LanguageListResponse(languages=get_supported_languages())


@router.post("/translate", response_model=TranslateResponse)
async def translate(req: TranslateRequest):
    if not req.bubbles:
        raise HTTPException(status_code=422, detail="No bubbles provided.")

    if not req.target_language:
        raise HTTPException(status_code=422, detail="target_language is required.")

    texts = [b.text for b in req.bubbles]

    try:
        translated_texts = await translate_batch(texts, req.target_language)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")

    translated_bubbles = []
    for bubble, translated in zip(req.bubbles, translated_texts):
        translated_bubbles.append(
            TranslatedBubble(
                **bubble.model_dump(),
                translated_text=translated,
                target_language=req.target_language,
            )
        )

    # Count how many came from cache (texts that matched mock or cached result)
    cached = sum(1 for t, tr in zip(texts, translated_texts) if t == tr)

    return TranslateResponse(
        job_id=req.job_id,
        target_language=req.target_language,
        bubbles=translated_bubbles,
        bubble_count=len(translated_bubbles),
        cached_count=cached,
    )