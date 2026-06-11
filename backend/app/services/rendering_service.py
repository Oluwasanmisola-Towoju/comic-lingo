"""
Text rendering service using Pillow

Draws translated text back into speech bubbles on the inpainted image.
steps:
    first call fit_text_to_bubble() to find the optimal font size and line breaks
    then draw a white stroke or outline around each character for readability on any bubble background color
    draw the main text in black on top of the outline
    center each line horizontally within the bubble
"""

import io
import numpy as np
from PIL import Image, ImageDraw
from typing import List

from app.utils.font_utils import fit_text_to_bubble

# Tuning parameters
TEXT_COLOR = (0, 0, 0) # black text 
STROKE_COLOR = (255, 255, 255) # white text outline (stroke)
STROKE_WIDTH = 2 # outline thickness
FORCE_UPPERCASE = True # comic text typically use upercase lettering

def render_translations(
        img_array: np.ndarray,
        bubbles: List[dict], # each: {x, y, width, height, translated_text}
) -> np.ndarray:
    
    """
    Draw translated text into each bubble on the already impainted image
    should return the final image as a BGR numpy array
    """
    # OpenCV is BGR format but Pillow is in RGB so that means we'll have to convert for drawing
    rgb_array = img_array[:, :, ::-1].copy()
    pil_img = Image.fromarray(rgb_array)
    draw = ImageDraw.Draw(pil_img)

    for bubble in bubbles:
        translated = bubble.get("translated_text", "").strip()
        if not translated:
            continue

        if FORCE_UPPERCASE:
            translated = translated.upper()

        bx = bubble["x"]
        by = bubble["y"]
        bw = bubble["width"]
        bh = bubble["height"]

        result = fit_text_to_bubble(translated, bx, by, bw, bh, draw)
        if result is None:
            continue

        lines, font, _, text_y, line_h = result

        for line in lines:
            try:
                bbox = draw.textbbox((0, 0), line, font=font)
                line_w = bbox[2] - bbox[0]
            except AttributeError:
                line_w, _ = draw.textsize(line, font=font)

            # center each line horizontally inside the bubble
            text_x = bx + (bw - line_w) / 2

            # draw white outline by rendering the text offset in 8 directions
            _draw_outlined_text(draw, text_x, text_y, line, font)

            text_y += line_h 

    # time to convert back to BGR numpy array for OpenCV and then save
    final_rgb = np.array(pil_img)
    return final_rgb[:, :, ::-1]

def _draw_outlined_text(
        draw: ImageDraw.ImageDraw,
        x: float,
        y: float,
        text: str,
        font
) -> None:
    """
    We Render the text with a white ouline by drawing the stroke in 8 directions 
    before we draw the main black text on top   
    """

    # try native Pillow stroke support
    try:
        draw.text(
            (x, y),
            text,
            font=font,
            fill=TEXT_COLOR,
            stroke_width=STROKE_WIDTH,
            stroke_fill=STROKE_COLOR
        )
        return 
    except TypeError:
        pass

    # manual fallback should be to draw outline in 8 directions
    for dx in range(-STROKE_WIDTH, STROKE_WIDTH + 1):
        for dy in range(-STROKE_WIDTH, STROKE_WIDTH + 1):
            if dx == 0 and dy == 0:
                continue
            draw.text((x + dx, y + dy), text, font=font, fill=STROKE_COLOR)
    
    draw.text((x, y), text, font=font, fill=TEXT_COLOR)

def numpy_to_bytes(img_array: np.ndarray, fmt: str = "JPEG") -> bytes:
    """ finally convert a BGR numpy array to image bytes for saving """
    rgb = img_array[:, :, ::-1]
    pil_img = Image.fromarray(rgb)

    buf = io.BytesIO()
    if fmt.upper() == "JPEG":
        pil_img.save(buf, format="JPEG", quality=95)
    else:
        pil_img.save(buf, format="PNG")
    
    return buf.getvalue()
