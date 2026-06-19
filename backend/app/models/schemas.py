from pydantic import BaseModel
from typing import Optional, List

class UploadResponse(BaseModel):
    job_id: str
    filename: str
    image_url: str
    width: int
    height: int
    message: str

class BoundingBox(BaseModel):
    id: str
    x: int
    y: int
    width: int
    height: int
    text: str
    confidence: float

class DetectResponse(BaseModel):
    job_id: str
    image_url: str
    image_width: int
    image_height: int
    bubbles: List[BoundingBox]
    bubble_count: int
    warning: Optional[str] = None   # surface non-fatal issues to the UI

class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    
class UploadURLRequest(BaseModel):
    image_url: str
    referrer: str = None