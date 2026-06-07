from pathlib import Path
from typing import List, Tuple, Optional
from PIL import ImageFont, ImageDraw

# Tuning parameters
MAX_FONT_SIZE = 52
MIN_FONT_SIZE = 10
FONT_STEP     = 2       # Step down by this many px per iteration
LINE_SPACING  = 1.25    # Line height multiplier (1.0 = tight, 1.5 = loose)
BUBBLE_PADDING = 14     # Pixels of padding inside each bubble before text starts

_font_cache: dict = {}

FONTS_DIR = Path(__file__).parent.parent.parent / "fonts"
PREFERRED_FONTS = [
    FONTS_DIR / "Bangers-Regular.ttf",
    FONTS_DIR / "AnonymousPro-Regular.ttf"
]

def load_font(size: int) -> ImageFont.FreeTypeFont:
    """ Load the best available comic font at a given size. Cached"""
    cache_key = size
    if cache_key in _font_cache:
        return _font_cache[cache_key]
    
    for font_path in PREFERRED_FONTS:
        if font_path.exists():
            font = ImageFont.truetype(str(font_path), size)
            _font_cache[cache_key] = font
            return font
    
    # last resort is to make PIL default to bitmap font ( although size control wont be available )
    print(f"[FONT] Warning: No TTF font found in {FONTS_DIR}. Using PIL default.")
    font = ImageFont.load_default()
    _font_cache[cache_key] = font
    return font

def wrap_text(
    text: str,
    font: ImageFont.FreeTypeFont,
    max_width: int,
    draw: ImageDraw.ImageDraw
) -> List[str]:
    """ 
    word wrap text to fit within max_width pixels
    Respect existing newlines in text
    """
    paragraphs = text.replace('\r\n', '\n').split('\n')
    lines: List[str] = []

    for para in paragraphs:
        words = para.split()
        if not words:
            lines.append('')
            continue

        current: List[str] = []
        for word in words:
            test_line = ' '.join(current + [word])
            try:
                bbox = draw.textbbox((0, 0), test_line, font=font)
                line_width = bbox[2] - bbox[0]
            except AttributeError:
                # order Pillow to fallback
                line_width, _ = draw.textsize(test_line, font=font)

            if line_width <= max_width:
                current.append(word)
            else: 
                if current:
                    lines.append(' '.join(current))
                current = [word]
            
        if current:
            lines.append(' '.join(current))
    
    return lines if lines else[text]

def measure_line_height(font: ImageFont.FreeTypeFont, draw: ImageDraw.ImageDraw) -> float:
    """Get actual rendered line height for a font"""
    try:
        bbox = draw.textbbox((0, 0), "Ag", font=font)
        return (bbox[3] - bbox[1]) * LINE_SPACING
    except AttributeError:
        _, h = draw.textsize("Ag", font=font)
        return h * LINE_SPACING

def fit_text_to_bubble(
    text: str,
    bubble_x: int,
    bubble_y: int,
    bubble_w: int,
    bubble_h: int,
    draw: ImageDraw.ImageDraw,
) -> Optional[Tuple[List[str], ImageFont.FreeTypeFont, float, float, float]]:
    """
    Find the largest font size where the wrapped text fits inside the bubble.

    It should return (lines, font, text_x, text_y, line_height) if text fits
    But wil return None if the bubble is too small for any text at all
    """
    max_text_w = bubble_w - BUBBLE_PADDING * 2
    max_text_h = bubble_h - BUBBLE_PADDING * 2

    if max_text_w < 20 or max_text_h < 10:
        return None

    clean_text = ' '.join(text.strip().split('\n'))

    for size in range(MAX_FONT_SIZE, MIN_FONT_SIZE - 1, -FONT_STEP):
        font = load_font(size)
        lines = wrap_text(clean_text, font, max_text_w, draw)
        line_h = measure_line_height(font, draw)
        total_h = len(lines) * line_h

        if total_h <= max_text_h:
            # Center the text block in the bubble
            text_block_top = bubble_y + (bubble_h - total_h) / 2
            # X will be computed per-line (centered)
            return (lines, font, float(bubble_x), text_block_top, line_h)

    # Force minimum size, make it to still render, even if slightly overflowing
    font = load_font(MIN_FONT_SIZE)
    lines = wrap_text(clean_text, font, max_text_w, draw)
    line_h = measure_line_height(font, draw)
    text_block_top = bubble_y + (bubble_h - len(lines) * line_h) / 2
    return (lines, font, float(bubble_x), text_block_top, line_h)