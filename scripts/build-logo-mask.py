#!/usr/bin/env python3
"""Build the wordmark height/alpha mask consumed by Logo3D.jsx.

Reads the 1024x1024 brand icon, isolates the dark wordmark strokes and writes a
grayscale mask (white = raised letterform, black = background) cropped to the
wordmark bounding box.

The mask is deliberately softened: Logo3D.jsx turns it into a steep height ramp
that reads as extruded letters with rounded edges, so a hard 1-bit edge would
alias badly once displaced.

Usage: python3 scripts/build-logo-mask.py
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "public" / "icon.png"
TARGET = ROOT / "public" / "xignis-wordmark-mask.png"

# Upscale factor for the stored mask. Displacement sampling is smoother than the
# source raster, and the file stays small because it is 8-bit grayscale.
UPSCALE = 2

# Relative luminance below this counts as a stroke. The brand green is
# ~140 luminance, the strokes are ~0.
LUMINANCE_THRESHOLD = 90

# Gaussian blur radius, in source pixels, applied to the 1-bit mask before the
# upscale. This is what gives the letters their rounded extruded edge.
SOFTEN_RADIUS = 3.0

# Padding around the wordmark bounding box, in source pixels.
PADDING = 18


def luminance_threshold(image: Image.Image) -> np.ndarray:
    """Return a boolean mask of the dark strokes on the green field."""
    array = np.asarray(image.convert("RGB")).astype(np.float32)
    luma = 0.299 * array[:, :, 0] + 0.587 * array[:, :, 1] + 0.114 * array[:, :, 2]
    return luma < LUMINANCE_THRESHOLD


def wordmark_rows(strokes: np.ndarray) -> tuple[int, int]:
    """Return the y range of the script wordmark, excluding the "TEAM" sub-label.

    The lockup is two horizontally separate row bands with a gap between them;
    the wordmark is the taller upper band.
    """
    populated = np.where(strokes.any(axis=1))[0]
    bands: list[tuple[int, int]] = []
    start = previous = populated[0]
    for y in populated[1:]:
        if y != previous + 1:
            bands.append((start, previous))
            start = y
        previous = y
    bands.append((start, previous))

    tallest = max(bands, key=lambda band: band[1] - band[0])
    return tallest


def main() -> None:
    source = Image.open(SOURCE)
    strokes = luminance_threshold(source)

    top, bottom = wordmark_rows(strokes)
    columns = np.where(strokes[top : bottom + 1].any(axis=0))[0]
    left, right = int(columns.min()), int(columns.max())

    height, width = strokes.shape
    left = max(0, left - PADDING)
    right = min(width - 1, right + PADDING)
    top = max(0, top - PADDING)
    bottom = min(height - 1, bottom + PADDING)

    cropped = (strokes[top : bottom + 1, left : right + 1] * 255).astype(np.uint8)
    mask = Image.fromarray(cropped, mode="L")
    mask = mask.filter(ImageFilter.GaussianBlur(radius=SOFTEN_RADIUS))
    mask = mask.resize(
        (mask.width * UPSCALE, mask.height * UPSCALE), Image.LANCZOS
    )

    TARGET.parent.mkdir(parents=True, exist_ok=True)
    mask.save(TARGET)

    print(f"wordmark bbox      x {left}-{right}  y {top}-{bottom}")
    print(f"mask               {TARGET.relative_to(ROOT)}")
    print(f"mask size          {mask.width}x{mask.height}")
    print(f"aspect ratio       {mask.width / mask.height:.4f}")
    print(f"coverage           {np.asarray(mask).mean() / 255:.4f}")


if __name__ == "__main__":
    main()
