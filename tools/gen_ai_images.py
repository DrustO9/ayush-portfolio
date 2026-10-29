"""Generate the portfolio's AI visuals: one image per item in js/data.js, drawn from the real
numbers in the CV (attention maps, agent graphs, PR curves, order-book depth...), plus the
portrait monogram and the loading-screen mosaic atlas.

Usage:  python -I tools/gen_ai_images.py

Writes assets/img/hd/<id>.jpg (viewer), assets/img/<id>.jpg (preview), assets/img/thumb/<id>.jpg,
assets/img/mosaic.webp and assets/img/mosaic.json.
"""
import io
import json
import random
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.colors import LinearSegmentedColormap
from matplotlib.patches import FancyBboxPatch, Circle
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "img"
PREVIEW_W, THUMB_W = 1400, 520
TILE_W, TILE_H, COLS, MAX_TILES = 120, 90, 16, 288

BG = "#0f0b0d"
PANEL = "#1a1416"
INK = "#ece2d3"
MUTED = "#8a7d70"
GLOW = "#f2a65a"
TERRA = "#c8693a"
TEAL = "#7fd3c8"
VIOLET = "#a78bfa"
SAND = "#c8ae8f"
WARM = LinearSegmentedColormap.from_list("warm", [BG, "#3a1e1a", TERRA, GLOW, "#ffe6c2"])
COOL = LinearSegmentedColormap.from_list("cool", ["#16263a", "#2c6f80", TEAL, "#e8fff9"])
DUAL = LinearSegmentedColormap.from_list("dual", [VIOLET, TEAL, GLOW])

rng = np.random.default_rng(42)
random.seed(7)

plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "text.color": INK, "axes.labelcolor": MUTED, "xtick.color": MUTED, "ytick.color": MUTED,
    "axes.edgecolor": "#3a3033", "axes.facecolor": BG, "figure.facecolor": BG,
    "axes.grid": True, "grid.color": "#2a2225", "grid.linewidth": 0.6,
    "axes.spines.top": False, "axes.spines.right": False,
})


def canvas(w=16, h=10):
    fig = plt.figure(figsize=(w, h), dpi=100)
    return fig


def label(fig, eyebrow, title):
    fig.text(0.045, 0.94, eyebrow.upper(), fontsize=13, color=GLOW, weight="bold", alpha=0.95)
    fig.text(0.045, 0.895, title, fontsize=26, color=INK, family="DejaVu Serif")


def glow_scatter(ax, x, y, s, c, alpha=1.0, z=3):
    for k, a in ((6, 0.05), (3, 0.12), (1.6, 0.3)):
        ax.scatter(x, y, s=s * k, c=c, alpha=a * alpha, linewidths=0, zorder=z)
    ax.scatter(x, y, s=s, c=c, alpha=alpha, linewidths=0, zorder=z + 1)


def box(ax, x, y, w, h, text, color=TEAL, fs=15, sub=None):
    ax.add_patch(FancyBboxPatch((x - w / 2, y - h / 2), w, h, boxstyle="round,pad=0.012,rounding_size=0.025",
                                fc=PANEL, ec=color, lw=2.2, zorder=4))
    ax.text(x, y + (0.018 if sub else 0), text, ha="center", va="center", fontsize=fs, color=INK, zorder=5, weight="bold")
    if sub:
        ax.text(x, y - 0.03, sub, ha="center", va="center", fontsize=fs - 4, color=MUTED, zorder=5)


def arrow(ax, a, b, color=MUTED, rad=0.0, lw=1.8):
    ax.annotate("", xy=b, xytext=a, zorder=3,
                arrowprops=dict(arrowstyle="-|>", color=color, lw=lw, mutation_scale=18,
                                connectionstyle=f"arc3,rad={rad}", shrinkA=8, shrinkB=8))


def blank_ax(fig, rect=(0, 0, 1, 1)):
    ax = fig.add_axes(rect)
    ax.set_xlim(0, 1); ax.set_ylim(0, 1); ax.axis("off")
    ax.set_autoscale_on(False)
    return ax


# ---------------------------------------------------------------- charts reused by the project and competition stops

# ---------------------------------------------------------------- 01 School · 02 IIT Kharagpur

# ---------------------------------------------------------------- internships (logos in assets/logos)

LOGOS = ROOT / "assets" / "logos"


def logo(fig, name, rect):
    a = fig.add_axes(rect); a.axis("off")
    a.imshow(np.asarray(Image.open(LOGOS / f"{name}.png").convert("RGB")))
    return a


def logo_card(name, bg):
    def f():
        fig = canvas(8, 8); fig.patch.set_facecolor(bg)
        logo(fig, name, (0.05, 0.05, 0.9, 0.9))
        return fig
    return f


# ---------------------------------------------------------------- projects + competitions (stops 06-11)

RED = "#ff5a5f"
SKY = "#ffd166"


def project_hero(eyebrow, title, sub, tiles, col, repo=None, motif=None):
    fig = canvas(); ax = blank_ax(fig)
    for x in np.linspace(0.02, 0.98, 40): ax.plot([x, x], [0.03, 0.97], color="#1b1719", lw=0.6)
    for y in np.linspace(0.03, 0.97, 25): ax.plot([0.02, 0.98], [y, y], color="#1b1719", lw=0.6)
    ax.text(0.06, 0.88, eyebrow, fontsize=14, color=col, weight="bold")
    ax.text(0.06, 0.78, title, fontsize=38 if len(title) < 30 else 31, color=INK, family="DejaVu Serif")
    ax.text(0.06, 0.715, sub, fontsize=17, color=MUTED)
    if motif: motif(ax)
    for i, (big, small) in enumerate(tiles):
        x = 0.06 + i * 0.3
        ax.add_patch(FancyBboxPatch((x, 0.14), 0.27, 0.46, boxstyle="round,pad=0.005,rounding_size=0.02", fc=PANEL, ec="#2e2528", lw=1.5))
        ax.add_patch(FancyBboxPatch((x, 0.14), 0.27, 0.008, boxstyle="square,pad=0", fc=col, ec=col))
        ax.text(x + 0.025, 0.48, big, fontsize=50 if len(big) < 7 else 38, color=col, weight="bold", va="center")
        for k, line in enumerate(small):
            ax.text(x + 0.025, 0.36 - k * 0.05, line, fontsize=15, color=INK if k == 0 else MUTED)
    if repo:
        ax.text(0.06, 0.07, f"github.com/DrustO9/{repo}", fontsize=15, color=col, family="DejaVu Sans Mono")
    return fig


# ---------------------------------------------------------------- portrait monogram

def photo(file, box=None):
    def f():
        im = Image.open(ROOT / "assets" / "photos" / file).convert("RGB")
        return im.crop(box) if box else im
    return f


ITEMS = {
    "school-card": photo("school-card.webp"), "iit-card": photo("iit-card.webp"),
    # his posters, each cut into its three panels: the centre banner and the two side panels
    "zepto-card": photo("zepto-poster.webp", (494, 16, 1503, 644)),
    "zepto-spend": photo("zepto-poster.webp", (20, 20, 474, 628)), "zepto-vendor": photo("zepto-poster.webp", (1521, 12, 1980, 632)),
    "ixana-card": photo("ixana-poster.webp", (485, 20, 1520, 648)),
    "ixana-pm": photo("ixana-poster.webp", (19, 22, 470, 656)), "ixana-procure": photo("ixana-poster.webp", (1535, 14, 1981, 656)),
    "realtors-card": photo("realtors-poster.webp", (471, 22, 1478, 786)),
    "realtors-audit": photo("realtors-poster.webp", (18, 26, 446, 780)), "realtors-gis": photo("realtors-poster.webp", (1504, 20, 1925, 790)),
    "fraud-card": photo("fraud-poster.webp", (494, 28, 1508, 634)),
    "fraud-left": photo("fraud-poster.webp", (24, 18, 476, 638)), "fraud-right": photo("fraud-poster.webp", (1524, 16, 1976, 644)),
    "spam-card": photo("spam-poster.webp", (466, 18, 1534, 638)),
    "spam-left": photo("spam-poster.webp", (24, 12, 450, 642)), "spam-right": photo("spam-poster.webp", (1546, 12, 1979, 648)),
    "gan-card": photo("gan-poster.webp", (472, 24, 1480, 630)),
    "gan-left": photo("gan-poster.webp", (22, 30, 458, 640)), "gan-right": photo("gan-poster.webp", (1494, 18, 1978, 644)),
    "forecast-card": photo("forecast-poster.webp", (493, 24, 1505, 676)),
    "forecast-left": photo("forecast-poster.webp", (27, 22, 472, 684)), "forecast-right": photo("forecast-poster.webp", (1525, 18, 1974, 686)),
    "sakhi-card": photo("sakhi-poster.webp", (466, 18, 1476, 790)),
    "sakhi-left": photo("sakhi-poster.webp", (24, 28, 450, 790)), "sakhi-right": photo("sakhi-poster.webp", (1493, 20, 1920, 794)),
    "isro-card": photo("isro-poster.webp", (497, 26, 1495, 650)),
    "isro-left": photo("isro-poster.webp", (20, 26, 488, 650)), "isro-right": photo("isro-poster.webp", (1505, 26, 1982, 650)),
    "logo-zepto": logo_card("zepto", "#3d0066"), "logo-ixana": logo_card("ixana", "#242424"), "logo-360-realtors": logo_card("360-realtors", "#ffffff"),
    "about-portrait": photo("portrait.jpg"),
}


def render(fig):
    buf = io.BytesIO(); fig.savefig(buf, format="png", facecolor=fig.get_facecolor()); plt.close(fig)
    buf.seek(0); return Image.open(buf).convert("RGB")


def save(name, im):
    im.save(OUT / "hd" / f"{name}.jpg", quality=88, optimize=True, progressive=True)
    for w, folder, q in ((PREVIEW_W, OUT, 82), (THUMB_W, OUT / "thumb", 76)):
        small = im if im.width <= w else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        small.save(folder / f"{name}.jpg", quality=q, optimize=True, progressive=True)


def cover(im, w, h):
    iw, ih = im.size; s = max(w / iw, h / ih)
    im = im.resize((max(w, round(iw * s)), max(h, round(ih * s))), Image.LANCZOS)
    x = (im.width - w) // 2; y = (im.height - h) // 2
    return im.crop((x, y, x + w, y + h))


def mosaic(images):
    tiles = []
    for im in images:
        tiles.append(cover(im, TILE_W, TILE_H))
        for _ in range(16):  # close-up details of each visual
            cw = random.randint(im.width // 8, im.width // 3); ch = int(cw * TILE_H / TILE_W)
            x = random.randint(0, im.width - cw); y = random.randint(0, im.height - ch)
            t = cover(im.crop((x, y, x + cw, y + ch)), TILE_W, TILE_H)
            if np.asarray(t.convert("L")).std() > 14: tiles.append(t)  # skip near-empty background
    random.shuffle(tiles); tiles = tiles[:MAX_TILES]
    rows = (len(tiles) + COLS - 1) // COLS
    atlas = Image.new("RGB", (COLS * TILE_W, rows * TILE_H), (20, 14, 13))
    for i, t in enumerate(tiles): atlas.paste(t, ((i % COLS) * TILE_W, (i // COLS) * TILE_H))
    atlas.save(OUT / "mosaic.webp", "WEBP", quality=74, method=6)
    meta = {"count": len(tiles), "cols": COLS, "tileW": TILE_W, "tileH": TILE_H}
    (OUT / "mosaic.json").write_text(json.dumps(meta))
    print("mosaic", meta)


def main():
    for d in (OUT, OUT / "hd", OUT / "thumb"): d.mkdir(parents=True, exist_ok=True)
    rendered = []
    for name, fn in ITEMS.items():
        im = fn()
        im = im if isinstance(im, Image.Image) else render(im)
        save(name, im); print(f"{name:18s} {im.size}")
        if name != "about-portrait" and not name.startswith("logo-"): rendered.append(im)
    mosaic(rendered)


if __name__ == "__main__":
    main()
