#!/usr/bin/env python3
"""Generate a typographic OG image (1200x630) for social sharing."""
import os
from PIL import Image, ImageDraw, ImageFont

WIDTH = 1200
HEIGHT = 630
BG = (246, 246, 244)
TEXT = (30, 30, 30)
MUTED = (120, 120, 120)

img = Image.new("RGB", (WIDTH, HEIGHT), BG)
draw = ImageDraw.Draw(img)

# Find a system font
title_font = ImageFont.load_default()
tag_font = ImageFont.load_default()
candidates = [
    "/System/Library/Fonts/Helvetica.ttc",
    "/System/Library/Fonts/SFPro.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
]
for fp in candidates:
    if os.path.exists(fp):
        try:
            title_font = ImageFont.truetype(fp, 72)
            tag_font = ImageFont.truetype(fp, 32)
            break
        except Exception:
            pass

title = "Studio Ordo"
tagline = "AI Training That Ships"

# Center title
tb = draw.textbbox((0, 0), title, font=title_font)
tw = tb[2] - tb[0]
draw.text(((WIDTH - tw) // 2, 200), title, fill=TEXT, font=title_font)

# Subtle separator
draw.line([(WIDTH // 2 - 60, 300), (WIDTH // 2 + 60, 300)], fill=MUTED, width=2)

# Center tagline
sb = draw.textbbox((0, 0), tagline, font=tag_font)
sw = sb[2] - sb[0]
draw.text(((WIDTH - sw) // 2, 320), tagline, fill=MUTED, font=tag_font)

out = os.path.join(os.path.dirname(__file__), "..", "public", "og-default.png")
img.save(out, "PNG")
print(f"Saved {os.path.getsize(out)} bytes to {out}")
