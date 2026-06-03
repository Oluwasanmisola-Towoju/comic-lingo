"""
Translation Service — OpenAI
Responsible only for: (text, target_language) to translated text.

To swap providers:
  1. Replace _translate_with_openai() with your provider's call.
  2. Keep the same function signature and return type.
  3. Nothing else changes.

Prompt engineering notes:
  - Each language has a tailored system prompt that encodes tonal expectations.
  - Pidgin
  - Yoruba
  - Swahili
  - For all languages: comic text is short, punchy, emotionally loaded. The LLM
    must preserve exclamation, hesitation, anger, fear not flatten them.
"""

import hashlib
import json
import os
import asyncio
from typing import Dict, List
from dataclasses import dataclass

import openai


# Language configurations 

LANGUAGE_CONFIGS: Dict[str, Dict] = {
    "nigerian_pidgin": {
        "label": "Nigerian Pidgin",
        "flag": "🇳🇬",
        "system_prompt": (
            "You are an expert translator specializing in Nigerian Pidgin English (Naija). "
            "Translate comic book speech bubble text into authentic, natural Nigerian Pidgin. "
            "Rules:\n"
            "- Use real Naija constructions: 'wetin', 'abeg', 'abi', 'na', 'dey', 'wahala', 'oya', 'e don do'\n"
            "- Preserve ALL emotional intensity: shouting stays shouting, fear stays fearful\n"
            "- Keep exclamation marks, ellipses, and emphasis exactly as dramatic as the original\n"
            "- Comic text is short and punchy — never pad or explain\n"
            "- Do NOT translate into formal English with Pidgin sprinkled in\n"
            "- Return ONLY the translated text. No explanations, no alternatives, no quotes."
        ),
    },
    "yoruba": {
        "label": "Yoruba",
        "flag": "🇳🇬",
        "system_prompt": (
            "You are an expert translator specializing in Yoruba as spoken in Southwest Nigeria. "
            "Translate comic book speech bubble text into natural, conversational Yoruba. "
            "Rules:\n"
            "- Use modern everyday Yoruba, not archaic or overly literary forms\n"
            "- Common loanwords used by Yoruba speakers are acceptable where natural\n"
            "- Preserve ALL emotional intensity: anger, fear, surprise, urgency\n"
            "- Keep sentence length short and punchy — this is a comic, not prose\n"
            "- Use tonal diacritics (à, á, ẹ, ọ, ṣ, etc.) correctly\n"
            "- Return ONLY the translated text. No explanations, no transliteration, no quotes."
        ),
    },
    "swahili": {
        "label": "Swahili",
        "flag": "🌍",
        "system_prompt": (
            "You are an expert translator specializing in conversational East African Swahili. "
            "Translate comic book speech bubble text into natural, spoken Swahili. "
            "Rules:\n"
            "- Use everyday Swahili as spoken in Kenya and Tanzania, not overly formal\n"
            "- Preserve emotional intensity, urgency, and dramatic tone throughout\n"
            "- Keep text short and punchy — comic bubbles are brief by design\n"
            "- Common expressions like 'Pole!', 'Haraka!', 'Basi!' add authenticity\n"
            "- Return ONLY the translated text. No explanations, no alternatives, no quotes."
        ),
    },
    "igbo": {
        "label": "Igbo",
        "flag": "🇳🇬",
        "system_prompt": (
            "You are an expert translator specializing in Igbo as spoken in Southeast Nigeria. "
            "Translate comic book speech bubble text into natural, modern conversational Igbo. "
            "Rules:\n"
            "- Use everyday spoken Igbo, not overly literary or archaic forms\n"
            "- Preserve ALL emotional intensity and dramatic tone\n"
            "- Keep text short, punchy, and dialogue-appropriate\n"
            "- Use correct tone marks where essential for meaning\n"
            "- Return ONLY the translated text. No explanations, no quotes."
        ),
    },
    "hausa": {
        "label": "Hausa",
        "flag": "🇳🇬",
        "system_prompt": (
            "You are an expert translator specializing in Hausa as spoken in Northern Nigeria and Niger. "
            "Translate comic book speech bubble text into natural, conversational Hausa. "
            "Rules:\n"
            "- Use everyday spoken Hausa, not formal or archaic register\n"
            "- Preserve emotional intensity: anger, fear, surprise, urgency\n"
            "- Keep sentences short and punchy — this is comic dialogue\n"
            "- Return ONLY the translated text. No explanations, no quotes."
        ),
    },
    "french": {
        "label": "French",
        "flag": "🇫🇷",
        "system_prompt": (
            "You are an expert translator specializing in French comic book dialogue. "
            "Translate speech bubble text into natural, colloquial French. "
            "Rules:\n"
            "- Use conversational French, not formal or literary register\n"
            "- Preserve ALL emotional intensity, exclamations, and dramatic pacing\n"
            "- French comic expressions like 'Zut!', 'Hein?', 'Ouais' add authenticity\n"
            "- Keep text short and punchy\n"
            "- Return ONLY the translated text. No explanations, no quotes."
        ),
    },
    "spanish": {
        "label": "Spanish",
        "flag": "🇪🇸",
        "system_prompt": (
            "You are an expert translator specializing in Spanish comic book dialogue. "
            "Translate speech bubble text into natural, colloquial Latin American Spanish. "
            "Rules:\n"
            "- Use conversational Spanish, preserve emotional intensity\n"
            "- Include inverted punctuation (¡, ¿) correctly\n"
            "- Keep text short, punchy, dialogue-appropriate\n"
            "- Return ONLY the translated text. No explanations, no quotes."
        ),
    },
    "portuguese": {
        "label": "Portuguese (BR)",
        "flag": "🇧🇷",
        "system_prompt": (
            "You are an expert translator specializing in Brazilian Portuguese comic dialogue. "
            "Translate speech bubble text into natural, colloquial Brazilian Portuguese. "
            "Rules:\n"
            "- Use everyday Brazilian Portuguese, not European Portuguese or formal register\n"
            "- Preserve emotional intensity throughout\n"
            "- Keep text short and punchy\n"
            "- Return ONLY the translated text. No explanations, no quotes."
        ),
    },
    "arabic": {
        "label": "Arabic",
        "flag": "🇸🇦",
        "system_prompt": (
            "You are an expert translator specializing in Modern Standard Arabic for comics. "
            "Translate speech bubble text into clear, accessible Arabic. "
            "Rules:\n"
            "- Use Modern Standard Arabic that is widely understood across the Arab world\n"
            "- Preserve emotional intensity and dramatic tone\n"
            "- Keep text short and dialogue-appropriate\n"
            "- Return ONLY the translated text in Arabic script. No explanations, no quotes."
        ),
    },
    "japanese": {
        "label": "Japanese",
        "flag": "🇯🇵",
        "system_prompt": (
            "You are an expert translator specializing in Japanese manga-style dialogue. "
            "Translate speech bubble text into natural Japanese. "
            "Rules:\n"
            "- Use conversational Japanese appropriate for manga\n"
            "- Preserve emotional intensity and dramatic pacing\n"
            "- Use appropriate sentence-final particles for emotion (よ, ね, ぞ, か)\n"
            "- Keep text concise — manga bubbles are tight\n"
            "- Return ONLY the translated text. No romanization, no explanations."
        ),
    },
}


# Translation cache 

_cache: Dict[str, str] = {}

def _cache_key(text: str, language: str) -> str:
    raw = f"{language}::{text.strip().lower()}"
    return hashlib.md5(raw.encode()).hexdigest()


# Core translation function 

async def translate_text(text: str, target_language: str) -> str:
    """
    Translate a single text string to the target language.
    Returns cached result if available.
    """
    if not text.strip():
        return text

    key = _cache_key(text, target_language)
    if key in _cache:
        return _cache[key]

    config = LANGUAGE_CONFIGS.get(target_language)
    if not config:
        raise ValueError(f"Unsupported language: {target_language}")

    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        # fallback to return mock translation
        result = _mock_translation(text, target_language)
        _cache[key] = result
        return result

    result = await _translate_with_openai(text, config["system_prompt"], api_key)
    _cache[key] = result
    return result


async def translate_batch(
    texts: List[str],
    target_language: str,
    max_concurrency: int = 5,
) -> List[str]:
    """
    Translate a list of texts concurrently, respecting a concurrency limit
    to avoid hammering the OpenAI rate limit.
    """
    semaphore = asyncio.Semaphore(max_concurrency)

    async def _bounded(text: str) -> str:
        async with semaphore:
            return await translate_text(text, target_language)

    # Get all the bounded tasks concurrently
    return await asyncio.gather(*[_bounded(t) for t in texts])


async def _translate_with_openai(text: str, system_prompt: str, api_key: str) -> str:
    """Call the OpenAI chat completions API."""
    client = openai.AsyncOpenAI(api_key=api_key)

    response = await client.chat.completions.create(
        model="gpt-4o-mini",        # chose this model cause it's faster and cheaper
        max_tokens=300,
        temperature=0.3,            # Low temp means consistent, accurate translations
        messages=[
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": (
                    f"Translate this comic speech bubble text:\n\n{text}"
                ),
            },
        ],
    )

    return response.choices[0].message.content.strip()


def _mock_translation(text: str, language: str) -> str:
    """Returns mock translations for dev testing without an API key."""
    mocks = {
        "nigerian_pidgin": {
            "Wait — did you hear that?": "Wait — you hear am?",
            "Yes. Something moved in the shadows.": "Yes. Something dey move for the darkness.",
            "We need to move. NOW.": "We need to commot. NOW.",
            "But what about the others?": "But wetin go happen to the others?",
        },
        "yoruba": {
            "Wait — did you hear that?": "Dúró — ṣé o gbọ́ ìyẹn?",
            "We need to move. NOW.": "A gbọdọ̀ lọ. NÍSINSIN YÌÍ.",
        },
        "swahili": {
            "Wait — did you hear that?": "Subiri — ulisikia hiyo?",
            "We need to move. NOW.": "Tunahitaji kwenda. SASA HIVI.",
        },
    }
    lang_mocks = mocks.get(language, {})
    return lang_mocks.get(text.strip(), f"[{language.upper()}] {text}")


def get_supported_languages() -> List[Dict]:
    """Returns language list for the frontend selector."""
    return [
        {"code": code, "label": cfg["label"], "flag": cfg["flag"]}
        for code, cfg in LANGUAGE_CONFIGS.items()
    ]