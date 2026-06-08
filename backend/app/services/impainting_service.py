"""
Inpainting Service using OpenCV
Erases original text from speech bubbles in the comic page image

Strategy used per bubble:
    first inset the bounding box by BORDER_INSET pixels so we don't erase
    the bubble's own border (which is part of the art)
    
    then sample the bubble interior to determine background type:
      If >WHITENESS_THRESHOLD of pixels are near-white → white fill (fast, clean)
      else → OpenCV TELEA inpainting (reconstructs complex backgrounds)

    after checks build a soft mask with slightly blurred edges for seamless blending.

To swap the inpainting algorithm:
  - Replace cv2.INPAINT_TELEA with cv2.INPAINT_NS (Navier-Stokes, slower but
    sometimes better on large regions).
  - Or replace the entire _inpaint_region() function with a neural inpainting
    call (e.g. LaMa, MAT) for dramatically better results on complex art.
"""

import cv2
import numpy as np
from typing import List, Tuple

# Tuning parameters 
BORDER_INSET      = 4     # px to inset from bubble edge (preserves bubble border)
WHITENESS_THRESH  = 0.80  # fraction of near-white pixels to trigger white-fill
WHITE_PIXEL_VAL   = 230   # pixel value >= this is considered "white"
INPAINT_RADIUS    = 3     # cv2.inpaint radius to increase for thicker text strokes
MASK_BLUR_KERNEL  = 3     # blur mask edges for smoother blending

BubbleRect = Tuple[int, int, int, int]  # (x, y, w, h)


def erase_text_from_bubbles(image_path: str, bubbles: List[BubbleRect]) -> np.ndarray:
    """
    Load an image, erase text from all provided bubble regions, return the
    modified image as a numpy array (BGR).
    """
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"Cannot read image: {image_path}")

    H, W = img.shape[:2]

    for (bx, by, bw, bh) in bubbles:
        # Inset to preserve the bubble border
        ix = min(bx + BORDER_INSET, W - 1)
        iy = min(by + BORDER_INSET, H - 1)
        iw = max(1, min(bw - BORDER_INSET * 2, W - ix))
        ih = max(1, min(bh - BORDER_INSET * 2, H - iy))

        if iw < 4 or ih < 4:
            continue

        img = _erase_region(img, ix, iy, iw, ih)

    return img


def _erase_region(img: np.ndarray, x: int, y: int, w: int, h: int) -> np.ndarray:
    """Choose and apply the best erasure strategy for a single region"""
    H, W = img.shape[:2]

    # Clamp coords to image bounds
    x  = max(0, min(x, W - 1))
    y  = max(0, min(y, H - 1))
    w  = max(1, min(w, W - x))
    h  = max(1, min(h, H - y))

    roi = img[y:y+h, x:x+w]

    if _is_white_background(roi):
        return _white_fill(img, x, y, w, h)
    else:
        return _opencv_inpaint(img, x, y, w, h)


def _is_white_background(roi: np.ndarray) -> bool:
    """Return True if the region is predominantly white."""
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    white_pixels = np.sum(gray >= WHITE_PIXEL_VAL)
    total_pixels = gray.size
    return (white_pixels / total_pixels) >= WHITENESS_THRESH


def _white_fill(img: np.ndarray, x: int, y: int, w: int, h: int) -> np.ndarray:
    """Fill region with white — best for clean, flat-white bubble backgrounds."""
    result = img.copy()
    result[y:y+h, x:x+w] = 255
    return result


def _opencv_inpaint(img: np.ndarray, x: int, y: int, w: int, h: int) -> np.ndarray:
    """
    Use OpenCV TELEA inpainting to reconstruct the background behind text.
    Builds a mask of dark pixels (text strokes) within the region.
    """
    roi = img[y:y+h, x:x+w]
    gray_roi = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)

    # Threshold: dark pixels are likely text
    _, text_mask = cv2.threshold(gray_roi, 80, 255, cv2.THRESH_BINARY_INV)

    # Dilate mask slightly to fully cover anti-aliased text edges
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    text_mask = cv2.dilate(text_mask, kernel, iterations=1)

    # Blur mask edges for smoother blending
    if MASK_BLUR_KERNEL > 1:
        text_mask = cv2.GaussianBlur(text_mask, (MASK_BLUR_KERNEL, MASK_BLUR_KERNEL), 0)
        _, text_mask = cv2.threshold(text_mask, 127, 255, cv2.THRESH_BINARY)

    # If the mask covers almost everything, fall back to white fill
    coverage = np.sum(text_mask > 0) / text_mask.size
    if coverage > 0.85:
        return _white_fill(img, x, y, w, h)

    # Apply inpainting only to the ROI for performance
    inpainted_roi = cv2.inpaint(roi, text_mask, INPAINT_RADIUS, cv2.INPAINT_TELEA)

    result = img.copy()
    result[y:y+h, x:x+w] = inpainted_roi
    return result