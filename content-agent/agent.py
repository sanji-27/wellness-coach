"""
Daily Wellness Content Agent
============================
Generates a complete daily social-media package for the wellness coach:
  1. AI content (topic, caption, reel script, carousel slides, hashtags) via Gemini (free)
  2. Branded 1080x1080 post image
  3. 6-slide 1080x1350 carousel (hook -> problem -> 3 tips -> CTA), fresh visual per slide
  4. Animated 1080x1920 vertical reel: per-scene stock VIDEO or photo backgrounds,
     Ken Burns zoom on photos, word-synced burned captions, Indian-English voiceover
  5. Delivery to the coach's phone via Telegram bot

Visual sources (tried in order, all optional except the gradient fallback):
  local Stable Diffusion (Automatic1111 --api) -> Pixazo -> Pexels -> Unsplash
  -> Pixabay -> branded gradient. Reel scenes prefer Pexels stock VIDEO clips.

Required env var:
  GEMINI_API_KEY        - https://aistudio.google.com/apikey

Optional env vars:
  PEXELS_API_KEY        - https://www.pexels.com/api/ (photos + reel video backgrounds)
  UNSPLASH_ACCESS_KEY   - https://unsplash.com/developers
  PIXABAY_API_KEY       - https://pixabay.com/api/docs/
  SD_WEBUI_URL          - local Automatic1111 with --api, e.g. http://127.0.0.1:7860
  PIXAZO_API_KEY        - https://www.pixazo.ai (free tier: Flux Schnell / SDXL)
  PIXAZO_ENDPOINT       - full generate endpoint URL from your Pixazo dashboard
  TELEGRAM_BOT_TOKEN    - from @BotFather (delivery skipped if absent)
  TELEGRAM_CHAT_ID      - the coach's chat id with the bot
  TTS_VOICE             - default en-IN-PrabhatNeural (female: en-IN-NeerjaNeural)
"""

import asyncio
import base64
import bisect
import json
import os
import random
import re
import subprocess
import sys
import textwrap
import time
from datetime import date
from io import BytesIO
from pathlib import Path

import numpy as np
import requests
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# Windows consoles default to cp1252, which can't print emoji
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# ---------------------------------------------------------------------------
# Paths & config
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
HISTORY_FILE = BASE_DIR / "topic_history.json"
OUTPUT_DIR = BASE_DIR / "output" / date.today().isoformat()
ASSETS_DIR = OUTPUT_DIR / "assets"

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
UNSPLASH_ACCESS_KEY = os.getenv("UNSPLASH_ACCESS_KEY")
PEXELS_API_KEY = os.getenv("PEXELS_API_KEY")
PIXABAY_API_KEY = os.getenv("PIXABAY_API_KEY")
SD_WEBUI_URL = (os.getenv("SD_WEBUI_URL") or "").rstrip("/")
PIXAZO_API_KEY = os.getenv("PIXAZO_API_KEY")
PIXAZO_ENDPOINT = os.getenv("PIXAZO_ENDPOINT")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
TTS_VOICE = os.getenv("TTS_VOICE", "en-IN-PrabhatNeural")

# Newest free-tier model first; fall back automatically if unavailable.
GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"]
MAX_ATTEMPTS = 3          # per model, with exponential backoff
HISTORY_LIMIT = 60        # remember the last 60 topics (~2 months)

BRAND_LINE = "FREE 6 PM SESSION • Kannada • Tamil & Hindi available"
GOLD = (255, 214, 102)
WHITE = (255, 255, 255)
SOFT = (225, 228, 235)

SYSTEM_PROMPT = """You are the "Wellness Content Director", an elite AI agent for a wellness coach based in Bengaluru, India.
Your mission: generate daily social media content that drives traffic to the coach's FREE daily 6 PM IST online introduction session. The session is conducted in Kannada, with Tamil and Hindi interpretation available - when content mentions language, say it that way. Your content is written in English.

THE COACH'S SERVICE PILLARS (from their brochure - "Healthy eating habits, Nutrition for better life"):
weight loss, weight gain, digestive health, energy & fitness, ladies & children health, skin nutrition, stress management.
Their promise: "Can change you, your family & others life."

STRICT RULES:
1. You must avoid repetition. You are provided a list of previously used topics - never reuse or closely paraphrase them.
2. Every piece of content MUST end with a strong Call-to-Action (CTA) to join the 6 PM session.
3. Tone: warm, energetic, empathetic, culturally inclusive (acknowledge South Indian lifestyle, urban Bengaluru stress, and holistic wellness).
4. Output must be valid, raw JSON only. No markdown, no extra text.
5. You are NOT an assistant; you are a decision-maker. Do not ask for clarification. Just generate."""

USER_PROMPT_TEMPLATE = """Current Date: {today}
Previously used topics: {previous_topics}

Generate today's complete social media content package.

Step 1: Brainstorm a unique, fresh wellness topic. It MUST clearly belong to one of the coach's service pillars (weight loss, weight gain, digestive health, energy & fitness, ladies & children health, skin nutrition, stress management) - rotate across pillars day to day, and pick a pillar under-represented in the previous topics list.

Step 2: Write a 300-400 word Instagram/Facebook post caption engineered for engagement:
- Hook (first line, max 12 words): use ONE of these proven formulas - a startling stat, a myth-bust ("Everyone says X. They're wrong."), a painfully relatable moment, or a bold question. The first line decides whether anyone taps "more".
- Formatting: PLAIN TEXT ONLY - absolutely no markdown (no **, no *, no #headers); Instagram shows those as literal symbols. Short punchy lines. Blank line between ideas. Never a wall of text. 3-5 well-placed emojis total (not one per line).
- Body: 3 actionable tips as a numbered list, each with a one-line "why it works".
- Engagement devices: include ONE question readers can answer in the comments, and ONE save/share prompt (e.g. "Save this for tonight" or "Send this to someone who needs it").
- Bridge: the coach explains this deeper in the FREE 6 PM session (in Kannada; Tamil & Hindi interpretation available - mention this naturally once).
- CTA: "Ready to transform your health? Join our FREE 6 PM session tonight! Click the link in our bio."

Step 3: Write a 45-second Reel script with exactly 5 scenes. For each scene provide:
- scene (int), duration (int, seconds), text (short on-screen overlay, max 7 words), voiceover (one conversational narrator sentence, MAX 16 words, spoken aloud in about the scene duration), visual (stock search phrase - see VISUAL RULES below; every scene DIFFERENT).
The voiceover doubles as burned-in captions, so keep sentences punchy and rhythmic.
Total duration must be 40-50 seconds. The last scene must be the 6 PM CTA.

Step 4: Create a 6-slide Instagram carousel breaking down the topic:
- Slide 1: cover - a bold scroll-stopping hook (max 8 words) as title, one-line subtitle as body.
- Slide 2: the problem - why this matters (title max 6 words, body max 35 words).
- Slides 3-5: one actionable tip each (title max 6 words, body max 35 words).
- Slide 6: CTA - invite to tonight's FREE 6 PM session (title max 7 words, motivating body max 25 words).
Each slide also gets a visual (stock search phrase, each one DIFFERENT).

Step 5: Suggest a visual_keyword for the main square post (same VISUAL RULES).

VISUAL RULES for every "visual" field: describe a LITERAL, concrete, commonly photographed subject - a thing a stock photographer definitely shot. Good: "bowl of almonds and fruits on wooden table", "woman drinking water at office desk", "person walking in green park morning". Bad: "energy", "wellness journey", "inner peace". 3-7 words, physical objects or people doing visible actions.

Step 6: Generate exactly 10 high-impact hashtags (mix of broad wellness and local Bengaluru tags), each starting with #.

Respond with ONLY this JSON structure:
{{
  "topic": "string",
  "post_caption": "string",
  "reel_script": [{{"scene": 1, "duration": 8, "text": "string", "voiceover": "string", "visual": "string"}}],
  "carousel": [{{"slide": 1, "title": "string", "body": "string", "visual": "string"}}],
  "visual_keyword": "string",
  "hashtags": ["#tag1", "#tag2"]
}}"""


# ---------------------------------------------------------------------------
# Topic history (persisted in the repo so GitHub Actions runs remember it)
# ---------------------------------------------------------------------------
def load_history() -> list:
    if HISTORY_FILE.exists():
        try:
            return json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            print("WARN: topic_history.json unreadable, starting fresh")
    return []


def save_history(history: list) -> None:
    HISTORY_FILE.write_text(
        json.dumps(history[-HISTORY_LIMIT:], indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


# ---------------------------------------------------------------------------
# Gemini content generation (free tier, forced JSON, retries)
# ---------------------------------------------------------------------------
def strip_markdown(text: str) -> str:
    """Instagram renders markdown as literal symbols - convert to plain text."""
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)          # **bold** -> bold
    text = re.sub(r"(?m)^(\s*)\*\s+", r"\1• ", text)      # * bullets -> • bullets
    return text


def validate_content(data: dict) -> dict:
    for key in ("topic", "post_caption", "reel_script", "visual_keyword", "hashtags"):
        if key not in data:
            raise ValueError(f"missing key: {key}")
    data["post_caption"] = strip_markdown(data["post_caption"])
    if not isinstance(data["reel_script"], list) or not data["reel_script"]:
        raise ValueError("reel_script must be a non-empty list")
    for scene in data["reel_script"]:
        for key in ("scene", "duration", "text", "voiceover"):
            if key not in scene:
                raise ValueError(f"reel scene missing key: {key}")
        scene["duration"] = max(3, min(15, int(scene["duration"])))
        scene.setdefault("visual", data.get("visual_keyword", "wellness lifestyle"))
    # Carousel is enhancing, not critical - synthesize from the reel if absent
    slides = data.get("carousel")
    if not isinstance(slides, list) or len(slides) < 3:
        slides = [{"slide": i + 1, "title": s["text"], "body": s["voiceover"],
                   "visual": s.get("visual")}
                  for i, s in enumerate(data["reel_script"])]
    for slide in slides:
        if "title" not in slide or "body" not in slide:
            raise ValueError("carousel slide missing title/body")
        slide.setdefault("visual", data.get("visual_keyword", "wellness lifestyle"))
    data["carousel"] = slides[:10]  # Instagram allows max 10
    data["hashtags"] = [
        t if t.startswith("#") else f"#{t.lstrip('#')}" for t in data["hashtags"]
    ][:10]
    return data


def generate_content(history: list) -> dict:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=GEMINI_API_KEY)
    prompt = USER_PROMPT_TEMPLATE.format(
        today=date.today().strftime("%A, %d %B %Y"),
        previous_topics=json.dumps(history[-HISTORY_LIMIT:]) if history else "none yet",
    )

    last_error = None
    for model in GEMINI_MODELS:
        for attempt in range(1, MAX_ATTEMPTS + 1):
            try:
                print(f"Gemini: {model}, attempt {attempt}...")
                response = client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT,
                        response_mime_type="application/json",
                        temperature=0.9,
                    ),
                )
                raw = response.text.strip()
                if raw.startswith("```"):
                    raw = raw.split("```")[1].removeprefix("json").strip()
                return validate_content(json.loads(raw))
            except Exception as exc:  # network, quota, bad JSON, validation
                last_error = exc
                wait = 5 * (2 ** (attempt - 1))
                print(f"WARN: {type(exc).__name__}: {exc} - retrying in {wait}s")
                time.sleep(wait)
        print(f"Model {model} exhausted, trying next fallback model...")
    raise RuntimeError(f"All Gemini attempts failed. Last error: {last_error}")


# ---------------------------------------------------------------------------
# Visual providers: local SD -> Pixazo -> Pexels -> Unsplash -> Pixabay -> gradient
# ---------------------------------------------------------------------------
def crop_to(img: Image.Image, width: int, height: int) -> Image.Image:
    """Center-crop to the target aspect ratio, then resize."""
    target = width / height
    w, h = img.size
    if w / h > target:
        new_w = int(h * target)
        img = img.crop(((w - new_w) // 2, 0, (w + new_w) // 2, h))
    else:
        new_h = int(w / target)
        img = img.crop((0, (h - new_h) // 2, w, (h + new_h) // 2))
    return img.resize((width, height), Image.LANCZOS)


def _download_image(url: str) -> Image.Image:
    return Image.open(BytesIO(requests.get(url, timeout=30).content)).convert("RGB")


def fetch_sd_local(keyword: str, width: int, height: int):
    """Generate with a local Automatic1111 instance (started with --api)."""
    if not SD_WEBUI_URL:
        return None
    # Generate at reduced, /8-aligned resolution, then upscale
    scale = min(1.0, 832 / max(width, height))
    gw, gh = int(width * scale) // 8 * 8, int(height * scale) // 8 * 8
    resp = requests.post(f"{SD_WEBUI_URL}/sdapi/v1/txt2img", timeout=300, json={
        "prompt": f"professional lifestyle photography, {keyword}, warm natural "
                  f"light, realistic, high detail, indian urban context",
        "negative_prompt": "text, watermark, logo, deformed, cartoon, low quality",
        "width": gw, "height": gh, "steps": 25,
    })
    resp.raise_for_status()
    img = Image.open(BytesIO(base64.b64decode(resp.json()["images"][0]))).convert("RGB")
    return crop_to(img, width, height)


def fetch_pixazo(keyword: str, width: int, height: int):
    """Generate via Pixazo's free tier (Flux Schnell / SDXL). Requires BOTH
    PIXAZO_API_KEY and PIXAZO_ENDPOINT (copy the generate URL from your
    dashboard - the free-tier endpoint is not publicly documented)."""
    if not (PIXAZO_API_KEY and PIXAZO_ENDPOINT):
        return None
    resp = requests.post(PIXAZO_ENDPOINT, timeout=120,
                         headers={"Ocp-Apim-Subscription-Key": PIXAZO_API_KEY,
                                  "Content-Type": "application/json"},
                         json={"prompt": f"professional lifestyle photography, "
                                         f"{keyword}, warm natural light, realistic",
                               "sync_mode": True})
    resp.raise_for_status()
    body = resp.json()
    if isinstance(body.get("images"), list) and body["images"]:
        first = body["images"][0]
        raw = first.get("b64_json") or first.get("base64") or first
        if isinstance(raw, str) and raw.startswith("http"):
            return crop_to(_download_image(raw), width, height)
        return crop_to(Image.open(BytesIO(base64.b64decode(raw))).convert("RGB"),
                       width, height)
    for key in ("image_url", "url", "output"):
        if isinstance(body.get(key), str):
            return crop_to(_download_image(body[key]), width, height)
    raise RuntimeError(f"unrecognized Pixazo response keys: {list(body)}")


def fetch_pexels(keyword: str, width: int, height: int):
    if not PEXELS_API_KEY:
        return None
    orientation = "portrait" if height > width else ("square" if height == width else "landscape")
    resp = requests.get("https://api.pexels.com/v1/search", timeout=20,
                        params={"query": keyword, "orientation": orientation,
                                "per_page": 8},
                        headers={"Authorization": PEXELS_API_KEY})
    resp.raise_for_status()
    photos = resp.json().get("photos") or []
    if not photos:
        return None
    return crop_to(_download_image(random.choice(photos)["src"]["large2x"]),
                   width, height)


def fetch_unsplash(keyword: str, width: int, height: int):
    if not UNSPLASH_ACCESS_KEY:
        return None
    orientation = "portrait" if height > width else "squarish"
    resp = requests.get("https://api.unsplash.com/photos/random", timeout=20,
                        params={"query": keyword, "orientation": orientation},
                        headers={"Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}"})
    resp.raise_for_status()
    return crop_to(_download_image(resp.json()["urls"]["regular"]), width, height)


def fetch_pixabay(keyword: str, width: int, height: int):
    if not PIXABAY_API_KEY:
        return None
    orientation = "vertical" if height > width else "horizontal"
    resp = requests.get("https://pixabay.com/api/", timeout=20,
                        params={"key": PIXABAY_API_KEY, "q": keyword[:100],
                                "image_type": "photo", "orientation": orientation,
                                "safesearch": "true", "per_page": 8})
    resp.raise_for_status()
    hits = resp.json().get("hits") or []
    if not hits:
        return None
    return crop_to(_download_image(random.choice(hits)["largeImageURL"]),
                   width, height)


IMAGE_PROVIDERS = [
    ("local-sd", fetch_sd_local),
    ("pixazo", fetch_pixazo),
    ("pexels", fetch_pexels),
    ("unsplash", fetch_unsplash),
    ("pixabay", fetch_pixabay),
]


def gradient_background(width: int, height: int) -> Image.Image:
    """Calm teal-to-indigo gradient - the always-works fallback."""
    top, bottom = (16, 94, 90), (49, 46, 129)
    img = Image.new("RGB", (width, height))
    px = img.load()
    for y in range(height):
        t = y / height
        row = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        for x in range(width):
            px[x, y] = row
    return img


def fetch_background(keyword: str, width: int, height: int) -> Image.Image:
    for name, provider in IMAGE_PROVIDERS:
        try:
            img = provider(keyword, width, height)
            if img is not None:
                print(f"  visual [{name}]: {keyword}")
                return img
        except Exception as exc:
            print(f"WARN: {name} failed for '{keyword}' ({exc}), trying next")
    print(f"  visual [gradient]: {keyword}")
    return gradient_background(width, height)


def fetch_pexels_video(keyword: str) -> Path | None:
    """Free portrait stock video clip for a reel scene background."""
    if not PEXELS_API_KEY:
        return None
    try:
        resp = requests.get("https://api.pexels.com/videos/search", timeout=20,
                            params={"query": keyword, "orientation": "portrait",
                                    "per_page": 4, "size": "medium"},
                            headers={"Authorization": PEXELS_API_KEY})
        resp.raise_for_status()
        videos = resp.json().get("videos") or []
        if not videos:
            return None
        files = sorted(videos[0]["video_files"], key=lambda f: f.get("height") or 0)
        pick = next((f for f in files if (f.get("height") or 0) >= 1280), files[-1])
        ASSETS_DIR.mkdir(parents=True, exist_ok=True)
        path = ASSETS_DIR / f"bg_{abs(hash(keyword)) % 10**8}.mp4"
        with requests.get(pick["link"], timeout=120, stream=True) as dl:
            dl.raise_for_status()
            with open(path, "wb") as f:
                for chunk in dl.iter_content(1 << 16):
                    f.write(chunk)
        if path.stat().st_size < 10_000:
            return None
        print(f"  visual [pexels-video]: {keyword}")
        return path
    except Exception as exc:
        print(f"WARN: pexels video failed for '{keyword}' ({exc})")
        return None


def darken(img: Image.Image, alpha: int) -> Image.Image:
    overlay = Image.new("RGBA", img.size, (0, 0, 0, alpha))
    return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")


# ---------------------------------------------------------------------------
# Cinematic grade + gradient scrim
# One fused linear transform per pixel: out = px * GAIN + BIAS, where GAIN
# combines a warm color grade, gentle contrast, and a vertical scrim that is
# darkest in the caption band - footage stays vivid, text stays readable.
# ---------------------------------------------------------------------------
_gain_cache = {}


def make_gain(height: int, base: float = 0.30):
    key = (height, base)
    if key not in _gain_cache:
        y = np.linspace(0.0, 1.0, height, dtype=np.float32)[:, None, None]

        def smoothstep(a, b, x):
            t = np.clip((x - a) / (b - a), 0.0, 1.0)
            return t * t * (3.0 - 2.0 * t)

        darkness = (base
                    + 0.30 * smoothstep(0.52, 0.95, y)      # caption/footer band
                    + 0.10 * smoothstep(0.18, 0.0, y))      # slight top vignette
        scrim = 1.0 - darkness
        warm = np.array([1.05, 1.0, 0.95], dtype=np.float32)  # warm cinematic
        contrast, pivot = 1.07, 118.0
        gain = (scrim * contrast * warm).astype(np.float32)         # (H,1,3)
        bias = (scrim * pivot * (1.0 - contrast)).astype(np.float32)  # (H,1,1)
        _gain_cache[key] = (gain, bias)
    return _gain_cache[key]


def stylize(img: Image.Image, base: float = 0.42) -> Image.Image:
    """Apply the grade+scrim to a still image (posts, carousel slides)."""
    gain, bias = make_gain(img.size[1], base)
    arr = np.array(img, dtype=np.float32)
    arr = arr * gain + bias
    np.clip(arr, 0, 255, out=arr)
    return Image.fromarray(arr.astype(np.uint8))


# ---------------------------------------------------------------------------
# Shared drawing helpers
# ---------------------------------------------------------------------------
def load_font(size: int, weight: str = "bold") -> ImageFont.FreeTypeFont:
    bundled = BASE_DIR / "fonts" / ("Poppins-Bold.ttf" if weight == "bold"
                                    else "Poppins-SemiBold.ttf")
    candidates = [
        str(bundled),                                             # brand font (OFL)
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",  # GitHub Actions / Linux
        "C:/Windows/Fonts/arialbd.ttf",                           # Windows
        "C:/Windows/Fonts/segoeuib.ttf",
        "/System/Library/Fonts/Helvetica.ttc",                    # macOS
    ]
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default(size=size)


def draw_centered(draw: ImageDraw.ImageDraw, text: str, font, y: int,
                  width: int, fill=WHITE, line_gap: int = 12,
                  wrap: int = 22, stroke: int = 0) -> int:
    """Draw wrapped, horizontally-centered text; return the y after the block."""
    for line in textwrap.wrap(text, width=wrap):
        box = draw.textbbox((0, 0), line, font=font, stroke_width=stroke)
        line_w, line_h = box[2] - box[0], box[3] - box[1]
        draw.text(((width - line_w) // 2, y), line, font=font, fill=fill,
                  stroke_width=stroke, stroke_fill=(16, 16, 22))
        y += line_h + line_gap
    return y


def draw_accent_rule(draw: ImageDraw.ImageDraw, width: int, y: int,
                     rule_w: int = 140) -> None:
    x0 = (width - rule_w) // 2
    draw.rounded_rectangle((x0, y, x0 + rule_w, y + 8), radius=4, fill=GOLD)


# ---------------------------------------------------------------------------
# Square post image
# ---------------------------------------------------------------------------
def create_post_image(keyword: str, topic: str, out_path: Path) -> Path:
    size = 1080
    img = stylize(fetch_background(keyword, size, size)
                  .filter(ImageFilter.GaussianBlur(1)), base=0.34)
    draw = ImageDraw.Draw(img)
    draw_accent_rule(draw, size, 300)
    y = draw_centered(draw, topic, load_font(72), 350, size, wrap=20, stroke=3)
    draw_centered(draw, BRAND_LINE, load_font(38), y + 60, size, fill=GOLD,
                  wrap=40, stroke=2)
    draw_centered(draw, "Link in bio to join tonight", load_font(34, "semibold"),
                  size - 160, size, fill=SOFT, wrap=40, stroke=2)
    img.save(out_path, quality=92)
    print(f"Image saved: {out_path}")
    return out_path


# ---------------------------------------------------------------------------
# Carousel (1080x1350, fresh topic-matched visual per slide)
# ---------------------------------------------------------------------------
def create_carousel(keyword: str, content: dict, out_dir: Path) -> list:
    width, height = 1080, 1350
    slides = content["carousel"]
    total = len(slides)
    paths = []
    base_cache = {}

    def base_for(visual: str) -> Image.Image:
        if visual not in base_cache:
            base_cache[visual] = stylize(
                fetch_background(visual, width, height)
                .filter(ImageFilter.GaussianBlur(2)), base=0.38)
        return base_cache[visual]

    for i, slide in enumerate(slides):
        img = base_for(slide.get("visual", keyword)).copy()
        is_cover, is_cta = i == 0, i == total - 1

        # Ghost number + counter chip on a proper alpha layer
        overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
        odraw = ImageDraw.Draw(overlay)
        if not (is_cover or is_cta):
            odraw.text((72, 150), f"0{i + 1}", font=load_font(230),
                       fill=(255, 255, 255, 42))
        odraw.rounded_rectangle((width - 190, 60, width - 60, 130), radius=35,
                                fill=(10, 10, 14, 200))
        chip = f"{i + 1}/{total}"
        chip_font = load_font(36)
        box = odraw.textbbox((0, 0), chip, font=chip_font)
        odraw.text((width - 125 - (box[2] - box[0]) // 2,
                    95 - (box[3] - box[1]) // 2 - box[1]),
                   chip, font=chip_font, fill=GOLD)
        img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
        draw = ImageDraw.Draw(img)

        if is_cover:
            draw_accent_rule(draw, width, 430)
            y = draw_centered(draw, slide["title"], load_font(84), 490, width,
                              wrap=16, stroke=3)
            draw_centered(draw, slide["body"], load_font(44, "semibold"), y + 40,
                          width, fill=SOFT, wrap=34, stroke=2)
        else:
            draw_accent_rule(draw, width, 470)
            y = draw_centered(draw, slide["title"], load_font(68), 530, width,
                              fill=GOLD if is_cta else WHITE, wrap=20, stroke=3)
            draw_centered(draw, slide["body"], load_font(44, "semibold"), y + 50,
                          width, fill=SOFT, wrap=36, stroke=2)

        # Footer: brand line + swipe hint / CTA
        draw_centered(draw, BRAND_LINE, load_font(32), height - 170, width,
                      fill=GOLD, wrap=50, stroke=2)
        footer = "Link in bio - join tonight!" if is_cta else "Swipe >>"
        draw_centered(draw, footer, load_font(34, "semibold"), height - 110,
                      width, fill=SOFT, wrap=50, stroke=2)

        path = out_dir / f"carousel_{i + 1}.png"
        img.save(path, quality=92)
        paths.append(path)

    print(f"Carousel saved: {total} slides in {out_dir}")
    return paths


# ---------------------------------------------------------------------------
# Voiceover (Microsoft Edge neural TTS - free, word-level timing for captions)
# ---------------------------------------------------------------------------
def generate_voiceovers(script: list, out_dir: Path) -> list:
    """Synthesize narration and capture word-level timestamps in the same pass.

    Returns [{"path": Path, "words": [{"start", "end", "text"}]}] per scene,
    or [] if TTS is unavailable (silent reel with static subtitles).
    """
    try:
        import edge_tts

        async def synth_one(text: str, path: Path) -> list:
            words = []
            # edge-tts 7.x defaults to SentenceBoundary; we need per-word timing
            communicate = edge_tts.Communicate(text, TTS_VOICE, boundary="WordBoundary")
            with open(path, "wb") as f:
                async for chunk in communicate.stream():
                    if chunk["type"] == "audio":
                        f.write(chunk["data"])
                    elif chunk["type"] == "WordBoundary":
                        words.append({
                            "start": chunk["offset"] / 1e7,  # 100ns units -> seconds
                            "end": (chunk["offset"] + chunk["duration"]) / 1e7,
                            "text": chunk["text"],
                        })
            return words

        async def synth_all():
            results = []
            for i, scene in enumerate(script):
                path = out_dir / f"vo_{i + 1}.mp3"
                words = await asyncio.wait_for(
                    synth_one(scene["voiceover"], path),
                    timeout=90,  # a hung connection must never stall the pipeline
                )
                results.append({"path": path, "words": words})
            return results

        voiceovers = asyncio.run(synth_all())
        if all(v["path"].stat().st_size > 0 for v in voiceovers):
            (out_dir / "vo_words.json").write_text(
                json.dumps([{"scene": i + 1, "words": v["words"]}
                            for i, v in enumerate(voiceovers)], indent=2),
                encoding="utf-8")
            print(f"Voiceover: {len(voiceovers)} scenes narrated by {TTS_VOICE} "
                  f"({sum(len(v['words']) for v in voiceovers)} timed words for captions)")
            return voiceovers
        raise RuntimeError("some voiceover files are empty")
    except Exception as exc:
        print(f"WARN: voiceover unavailable ({exc}) - building silent reel")
        return []


def build_caption_chunks(words: list, chunk_size: int = 2) -> list:
    """Group timed words into 2-word UPPERCASE caption chunks (video-use style).
    Each chunk's end is extended to the next chunk's start so captions never gap."""
    chunks = []
    for i in range(0, len(words), chunk_size):
        group = words[i:i + chunk_size]
        chunks.append({
            "start": group[0]["start"],
            "end": group[-1]["end"],
            "text": " ".join(w["text"] for w in group).upper(),
        })
    for j in range(len(chunks) - 1):
        chunks[j]["end"] = chunks[j + 1]["start"]
    if chunks:
        chunks[-1]["end"] += 0.35
    return chunks


# ---------------------------------------------------------------------------
# Animated vertical reel: stock video / Ken Burns photo per scene,
# word-synced captions, voiceover with fades
# ---------------------------------------------------------------------------
CAPTION_Y0, CAPTION_H = 1270, 200  # burned-caption band (lower third)


def render_scene_text(scene: dict, index: int, total: int, width: int,
                      height: int, static_subtitle: bool) -> Image.Image:
    """Transparent RGBA layer holding all static text/graphics for one scene."""
    layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    is_cta = index == total - 1

    draw_accent_rule(draw, width, height // 2 - 300)
    y = draw_centered(draw, scene["text"], load_font(88), height // 2 - 240,
                      width, fill=GOLD if is_cta else WHITE, wrap=16, stroke=4)
    if static_subtitle:
        draw_centered(draw, scene["voiceover"], load_font(44, "semibold"), y + 50,
                      width, fill=SOFT, wrap=34, stroke=2)
    if is_cta:
        draw_centered(draw, BRAND_LINE, load_font(40), height - 360, width,
                      fill=GOLD, wrap=30, stroke=2)

    # Progress dots
    dot_r, gap = 12, 44
    start_x = (width - (total - 1) * gap) // 2
    for i in range(total):
        fill = GOLD if i <= index else (140, 140, 140, 220)
        cx = start_x + i * gap
        draw.ellipse((cx - dot_r, height - 140, cx + dot_r, height - 140 + 2 * dot_r),
                     fill=fill)
    return layer


def create_reel(keyword: str, script: list, out_path: Path,
                voiceovers: list) -> Path:
    from moviepy import (AudioFileClip, CompositeAudioClip, VideoClip,
                         VideoFileClip, afx)

    width, height = 1080, 1920
    zoom_max = 1.06
    fade_secs = 0.5      # headline slide-up + fade-in
    crossfade = 0.22     # scene-to-scene transition
    big_w, big_h = int(width * zoom_max) // 2 * 2, int(height * zoom_max) // 2 * 2
    gain, bias = make_gain(height)  # cinematic grade + scrim, fused per-pixel
    photo_cache, video_cache = {}, {}
    open_videos = []

    def photo_bg(visual: str):
        if visual not in photo_cache:
            photo_cache[visual] = np.asarray(
                fetch_background(visual, big_w, big_h), dtype=np.uint8)
        return photo_cache[visual]

    def video_bg(visual: str):
        """A moving stock clip beats a still photo - try Pexels video first."""
        if visual not in video_cache:
            path = fetch_pexels_video(visual)
            clip = None
            if path is not None:
                try:
                    clip = VideoFileClip(str(path))
                    open_videos.append(clip)
                except Exception as exc:
                    print(f"WARN: could not open stock video ({exc})")
            video_cache[visual] = clip
        return video_cache[visual]

    caption_cache = {}

    def caption_layer(text: str):
        """Premultiplied caption band: bold UPPERCASE with black outline,
        auto-shrinking until the chunk fits the frame width."""
        if text in caption_cache:
            return caption_cache[text]
        img = Image.new("RGBA", (width, CAPTION_H), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        for size in (64, 54, 46, 40):
            font = load_font(size)
            box = draw.textbbox((0, 0), text, font=font, stroke_width=8)
            if box[2] - box[0] <= width - 140:
                break
        draw.text(((width - (box[2] - box[0])) // 2 - box[0],
                   (CAPTION_H - (box[3] - box[1])) // 2 - box[1]),
                  text, font=font, fill=WHITE,
                  stroke_width=8, stroke_fill=(12, 12, 16))
        # Cache as uint8 (4x smaller); premultiply per-use on the small band
        caption_cache[text] = np.asarray(img, dtype=np.uint8)
        return caption_cache[text]

    # ---- Gather per-scene data ------------------------------------------
    scenes = []
    for i, scene in enumerate(script):
        audio, chunks = None, []
        if voiceovers:
            audio = AudioFileClip(str(voiceovers[i]["path"]))
            # Pace the scene to the narration: a short breath, never dead air
            duration = max(3.0, audio.duration + 0.35)
            # 30ms fades at every cut so scene joins never pop (video-use rule)
            audio = audio.with_effects([afx.AudioFadeIn(0.03), afx.AudioFadeOut(0.03)])
            chunks = build_caption_chunks(voiceovers[i]["words"])
        else:
            duration = float(scene["duration"])

        visual = scene.get("visual", keyword)
        vclip = video_bg(visual)
        text_img = render_scene_text(scene, i, len(script), width, height,
                                     static_subtitle=not chunks)
        arr = np.asarray(text_img, dtype=np.float32)
        alpha = arr[:, :, 3:] / 255.0
        scenes.append({
            "dur": duration, "audio": audio, "chunks": chunks,
            "vclip": vclip, "bg": photo_bg(visual) if vclip is None else None,
            "zoom_in": i % 2 == 0, "alpha": alpha,
            "txt_pre": arr[:, :, :3] * alpha,
        })

    starts = [0.0]
    for s in scenes[:-1]:
        starts.append(starts[-1] + s["dur"])
    total = starts[-1] + scenes[-1]["dur"]

    # ---- One continuous clip: grade, animate, caption, crossfade ---------
    def scene_frame(i: int, lt: float):
        s = scenes[i]
        if s["vclip"] is not None:
            # Real stock footage: loop it if the scene outlasts the clip
            src = s["vclip"].get_frame(lt % max(s["vclip"].duration - 0.05, 0.1))
            frame = crop_to(Image.fromarray(src), width, height)
        else:
            # Ken Burns photo: centered numpy crop + one bilinear resize
            p = min(max(lt / s["dur"], 0.0), 1.0)
            scale = 1.0 + (zoom_max - 1.0) * (p if s["zoom_in"] else 1.0 - p)
            win_w, win_h = int(big_w / scale), int(big_h / scale)
            x0, y0 = (big_w - win_w) // 2, (big_h - win_h) // 2
            frame = Image.fromarray(s["bg"][y0:y0 + win_h, x0:x0 + win_w])
            frame = frame.resize((width, height), Image.BILINEAR)

        out = np.array(frame, dtype=np.float32)
        out *= gain          # cinematic grade + gradient scrim (one fused op)
        out += bias

        # Headline: ease-out slide-up + fade-in
        f = np.float32(min(lt / fade_secs, 1.0))
        ease = np.float32(1.0 - (1.0 - float(f)) ** 3)
        dy = int(44 * (1.0 - float(ease)))
        a = np.roll(s["alpha"], dy, axis=0) if dy else s["alpha"]
        tp = np.roll(s["txt_pre"], dy, axis=0) if dy else s["txt_pre"]
        out *= (np.float32(1.0) - a * ease)
        out += tp * ease

        # Timed caption chunk synced to the narration
        for chunk in s["chunks"]:
            if chunk["start"] <= lt < chunk["end"]:
                cap = caption_layer(chunk["text"]).astype(np.float32)
                cap_a = cap[:, :, 3:] * np.float32(1 / 255.0)
                band = out[CAPTION_Y0:CAPTION_Y0 + CAPTION_H]
                out[CAPTION_Y0:CAPTION_Y0 + CAPTION_H] = (
                    band * (np.float32(1.0) - cap_a) + cap[:, :, :3] * cap_a)
                break
        return out

    boundary_cache = {}

    def frame_function(t):
        # moviepy passes t as np.float64 - cast, or every frame buffer
        # silently promotes to float64 and doubles the render's memory
        t = float(t)
        i = min(max(bisect.bisect_right(starts, t) - 1, 0), len(scenes) - 1)
        lt = t - starts[i]
        out = scene_frame(i, lt)
        # Crossfade from the previous scene's final frame
        if i > 0 and lt < crossfade:
            if i not in boundary_cache:
                prev = scene_frame(i - 1, scenes[i - 1]["dur"] - 0.05)
                boundary_cache[i] = np.clip(prev, 0, 255).astype(np.uint8)
            w = np.float32(lt / crossfade)
            out = boundary_cache[i].astype(np.float32) * (np.float32(1.0) - w) + out * w
        np.clip(out, 0, 255, out=out)
        return out.astype(np.uint8)

    final = VideoClip(frame_function, duration=total)
    if voiceovers:
        final = final.with_audio(CompositeAudioClip(
            [s["audio"].with_start(starts[i]) for i, s in enumerate(scenes)]))
    final.write_videofile(str(out_path), fps=24, codec="libx264",
                          audio_codec="aac", preset="veryfast",
                          threads=os.cpu_count() or 2, logger=None)
    for v in open_videos:
        try:
            v.close()
        except Exception:
            pass

    if voiceovers:
        normalize_loudness(out_path)

    # Self-check the rendered output before it reaches the coach
    if not out_path.exists() or out_path.stat().st_size < 50_000:
        raise RuntimeError(f"reel render self-check failed: {out_path} is missing or tiny")
    n_videos = sum(1 for v in video_cache.values() if v is not None)
    print(f"Reel saved: {out_path} ({total:.0f}s, "
          f"{'voiced + captioned' if voiceovers else 'silent'}, "
          f"{n_videos}/{len(script)} scenes on stock video)")
    return out_path


def normalize_loudness(path: Path) -> None:
    """Normalize the reel's audio to -16 LUFS (social media standard) with
    ffmpeg loudnorm; video stream is copied untouched. Best-effort."""
    try:
        import imageio_ffmpeg
        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
        tmp = path.with_name(path.stem + "_norm.mp4")
        subprocess.run(
            [ffmpeg, "-y", "-i", str(path), "-c:v", "copy",
             "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-c:a", "aac", str(tmp)],
            check=True, capture_output=True, timeout=300)
        if tmp.exists() and tmp.stat().st_size > 50_000:
            tmp.replace(path)
            print("Audio loudness normalized to -16 LUFS")
    except Exception as exc:
        print(f"WARN: loudness normalization skipped ({exc})")


# ---------------------------------------------------------------------------
# Telegram delivery (image + carousel album + caption + voiced reel)
# ---------------------------------------------------------------------------
def telegram_api(method: str, *, files=None, **params) -> dict:
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/{method}"
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            resp = requests.post(url, data=params, files=files, timeout=180)
            body = resp.json()
            if body.get("ok"):
                return body
            raise RuntimeError(body.get("description", resp.text))
        except Exception as exc:
            if attempt == MAX_ATTEMPTS:
                raise
            print(f"WARN: Telegram {method} failed ({exc}), retrying...")
            time.sleep(5 * attempt)


def deliver_via_telegram(content: dict, image_path: Path,
                         carousel_paths: list, reel_path: Path) -> None:
    if not (TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID):
        print("Telegram not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID) - skipping delivery")
        return

    hashtags = " ".join(content["hashtags"])
    today = date.today().strftime("%d %b %Y")

    # 1. The single post image, with topic as short caption
    with open(image_path, "rb") as f:
        telegram_api("sendPhoto", chat_id=TELEGRAM_CHAT_ID,
                     caption=f"\U0001F4C5 {today}\n\U0001F3AF {content['topic']}",
                     files={"photo": f})

    # 2. Carousel slides as one album (sendMediaGroup, in posting order)
    if carousel_paths:
        media = [{"type": "photo", "media": f"attach://slide{i}"}
                 for i in range(len(carousel_paths))]
        media[0]["caption"] = "\U0001F4DA Carousel - post these in order"
        files = {f"slide{i}": open(p, "rb") for i, p in enumerate(carousel_paths)}
        try:
            telegram_api("sendMediaGroup", chat_id=TELEGRAM_CHAT_ID,
                         media=json.dumps(media), files=files)
        finally:
            for f in files.values():
                f.close()

    # 3. Full caption + hashtags as ONE copy-paste-ready message
    #    (Telegram media captions cap at 1024 chars, text messages allow 4096)
    telegram_api("sendMessage", chat_id=TELEGRAM_CHAT_ID,
                 text=f"{content['post_caption']}\n\n{hashtags}")

    # 4. The voiced reel (tip: add trending audio in Instagram at low volume)
    with open(reel_path, "rb") as f:
        telegram_api("sendVideo", chat_id=TELEGRAM_CHAT_ID,
                     caption="\U0001F3AC Reel - voiceover + captions included. "
                             "Add trending audio in Instagram at ~10% volume for reach.",
                     files={"video": f}, width=1080, height=1920,
                     supports_streaming=True)

    print("Delivered to Telegram ✅")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> int:
    if not GEMINI_API_KEY:
        print("ERROR: GEMINI_API_KEY is not set", file=sys.stderr)
        return 1

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    history = load_history()
    print(f"{len(history)} previous topics loaded")

    content = generate_content(history)
    print(f"Topic: {content['topic']}")

    # Persist everything before media steps so a media failure never loses content
    (OUTPUT_DIR / "content_ready.json").write_text(
        json.dumps(content, indent=2, ensure_ascii=False), encoding="utf-8")
    (OUTPUT_DIR / "caption.txt").write_text(
        f"{content['post_caption']}\n\n{' '.join(content['hashtags'])}",
        encoding="utf-8")

    history.append(content["topic"])
    save_history(history)

    image_path = create_post_image(content["visual_keyword"], content["topic"],
                                   OUTPUT_DIR / "daily_post.png")
    carousel_paths = create_carousel(content["visual_keyword"], content, OUTPUT_DIR)
    voiceovers = generate_voiceovers(content["reel_script"], OUTPUT_DIR)
    reel_path = create_reel(content["visual_keyword"], content["reel_script"],
                            OUTPUT_DIR / "daily_reel.mp4", voiceovers)

    deliver_via_telegram(content, image_path, carousel_paths, reel_path)

    print(f"\n✅ Done. Output in {OUTPUT_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
