"""Checks that every file the site asks for exists, with the exact upper/lower case (GitHub Pages runs
on Linux, where image.JPG and image.jpg are different files). Exits 1 and lists what is missing.

Usage:  python tools/check_assets.py
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def exists_exact(rel):
    """True only if every part of the path exists with exactly this spelling."""
    p = ROOT
    for part in Path(rel).parts:
        if not p.is_dir() or part not in {c.name for c in p.iterdir()}:
            return False
        p = p / part
    return True


src = {f: f.read_text(encoding="utf-8") for f in [ROOT / "index.html", *ROOT.glob("css/*.css"), *ROOT.glob("js/**/*.js")]}
code = "\n".join(src.values())
data = (ROOT / "js/data.js").read_text(encoding="utf-8")
need = {}  # path -> where it is asked for


def want(rel, why):
    need.setdefault(rel, why)


# literal paths: assets/... with an extension, not built from ${...}
for f, text in src.items():
    for m in re.finditer(r"""(?<![\w/])(assets/[\w./-]+?\.(?:jpe?g|png|webp|svg|json|glb|hdr|pdf|ico))""", text):
        want(m.group(1), f.relative_to(ROOT).as_posix())
# every image id in data.js, in its three sizes
ids = set(re.findall(r"""\b(?:hero|heroSecond|logo|portrait):\s*'([\w-]+)'""", data))
ids |= set(re.findall(r"""\{\s*id:\s*'([\w-]+)',\s*caption:""", data))
for w in re.findall(r"""walls:\s*\[([^\]]*)\]""", data):
    ids |= set(re.findall(r"'([\w-]+)'", w))
for i in ids:
    for d in ("", "hd/", "thumb/"):
        want(f"assets/img/{d}{i}.jpg", "js/data.js")
# section backgrounds, 3D models and Poly Haven textures
for b in re.findall(r"""bg:\s*'([\w.-]+)'""", data):
    want(f"assets/bg/{b}", "js/data.js sections")
for g in re.findall(r"""file:\s*'([\w/.-]+\.glb)'""", code):
    want(f"assets/models/{g}", "js/world/kit.js")
for t in set(re.findall(r"""pbr\('([\w-]+)'""", code)):
    for map_ in ("color", "normal", "rough"):
        want(f"assets/textures/{t}/{map_}.jpg", "pbr()")
for icon in ("gmail", "linkedin", "github"):
    want(f"assets/icons/{icon}.png", "contact icons")

missing = sorted((p, why) for p, why in need.items() if not exists_exact(p))
print(f"checked {len(need)} asset references")
for p, why in missing:
    print(f"  MISSING  {p}   (from {why})")
sys.exit(1 if missing else 0)
