"""Étalonnage des photos aux couleurs du festival (vert profond + rose clair).

Usage : python3 -I outils/etalonnage.py <dossier_sources> public/photos
Les sources (photos libres de Wikimedia Commons) sont listées dans PHOTOS ;
les crédits sont dans src/data/photos.ts.
"""
import sys, pathlib
import numpy as np
from PIL import Image

src, dst = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
VERT = np.array([8, 61, 61]) / 255      # #083D3D
CREME_ROSE = np.array([255, 232, 238]) / 255
ROSE = np.array([255, 160, 203]) / 255  # #FFA0CB

def etalonner(im, force=1.0, sombre=0.0, lueur=None, vignette=0.35):
    a = np.asarray(im.convert("RGB")).astype(np.float32) / 255
    if sombre:
        a = a ** (1 + sombre) * (1 - sombre * 0.35)
    a = a * np.array([0.9, 0.98, 1.03])  # vers l'émeraude
    lum = (a @ np.array([0.3, 0.59, 0.11]))[..., None]
    a = a + (1 - lum) ** 2 * (VERT - a) * 0.28 * force + lum ** 2 * (CREME_ROSE - a) * 0.14 * force
    h, w = a.shape[:2]
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    if lueur:
        cx, cy, rayon, intensite = lueur
        d = np.sqrt(((x / w - cx) * w / h) ** 2 + (y / h - cy) ** 2) / rayon
        g = (np.clip(1 - d, 0, 1) ** 2)[..., None] * intensite
        a = 1 - (1 - a) * (1 - ROSE * g)  # « écran » rose
    r = np.sqrt(((x / w - 0.5) * 1.1) ** 2 + ((y / h - 0.5)) ** 2)
    a = a * (1 - vignette * np.clip(r / 0.75, 0, 1) ** 2)[..., None]
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))

def recadrer(im, ratio, cx, cy):
    w, h = im.size
    if w / h > ratio:
        nw = int(h * ratio); x0 = int(np.clip(cx * w - nw / 2, 0, w - nw)); return im.crop((x0, 0, x0 + nw, h))
    nh = int(w / ratio); y0 = int(np.clip(cy * h - nh / 2, 0, h - nh)); return im.crop((0, y0, w, y0 + nh))

# Photo d'accueil : le ragondin qui nage (parc du château de Rambouillet)
heros = etalonner(Image.open(src / "hd-heros.jpg"), force=1.0, sombre=0.25, lueur=(0.92, 0.05, 0.9, 0.55), vignette=0.5)
for l in (2560, 1600, 960):
    heros.resize((l, round(heros.height * l / heros.width)), Image.LANCZOS).save(dst / f"ragondin-loing-{l}.webp", quality=80, method=6)

# Portraits du bestiaire (4:5), point d'intérêt (x, y)
PORTRAITS = {
    "ragondin": (0.28, 0.55), "martin": (0.5, 0.5), "demoiselle": (0.47, 0.5), "effraie": (0.55, 0.45),
    "renard": (0.5, 0.5), "pic": (0.58, 0.5), "fritillaire": (0.45, 0.62), "citron": (0.66, 0.5), "luciole": (0.56, 0.48),
}
for nom, (cx, cy) in PORTRAITS.items():
    im = recadrer(Image.open(src / f"hd-{nom}.jpg").convert("RGB"), 4 / 5, cx, cy)
    im = etalonner(im, force=0.7, sombre=0.08, lueur=(0.85, 0.08, 0.8, 0.25), vignette=0.3)
    im.resize((800, 1000), Image.LANCZOS).save(dst / f"{nom}.webp", quality=80, method=6)
print("ok")
