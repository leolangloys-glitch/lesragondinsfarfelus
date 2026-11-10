"""Sol en damier de l'affiche, en SVG extensible.

Reproduit le sol de la graphiste (public/brouillon/sol-damier.webp) : même
perspective, mêmes couleurs (relevées dans l'image), même découpe sous le
miroir, mais prolongé à gauche, à droite et vers le bas pour remplir tout
l'écran sans déformer les carreaux.

Usage : python3 -I outils/sol-damier.py public/brouillon/sol-damier.webp public/brouillon/sol-damier.svg

Les coordonnées du SVG sont celles de l'image d'origine (1410 × 371) :
x de -2600 à 4060, y de 4,5 à 1600. La page place l'origine de l'image au même
endroit que sur l'affiche (voir .affiche__sol dans src/pages/index.astro).
"""

import sys

import numpy as np
from PIL import Image

# Perspective relevée sur l'image de la graphiste
XV, YV = 728.0, -238.0  # point de fuite
PENTE = 0.4665  # largeur d'une colonne de carreaux = PENTE * (y - YV)
D0, PAS = 1 / 506.0, 0.000305  # rangées : 1/(y - YV) = D0 - v * PAS
X_MIN, X_MAX, Y_MIN, Y_MAX = -2600.0, 4060.0, 4.5, 1600.0


def y_de_v(v: float) -> float:
    d = D0 - v * PAS
    return YV + 1 / d if d > 1e-9 else 1e9


def couleurs(image: np.ndarray):
    """Couleur des carreaux clairs (vert) et sombres selon la hauteur."""
    tables = {"clair": [], "sombre": []}
    h, w, _ = image.shape
    for y in range(5, h, 3):
        acc = {"clair": [], "sombre": []}
        for x in list(range(20, 420, 4)) + list(range(1040, min(w, 1390), 4)):
            if image[y, x, 3] < 250:
                continue
            u = (x - XV) / (PENTE * (y - YV))
            v = (D0 - 1 / (y - YV)) / PAS
            fu, fv = u - np.floor(u), v - np.floor(v)
            if not (0.06 < fu < 0.94 and 0.05 < fv < 0.95):
                continue
            classe = "clair" if (np.floor(u) + np.floor(v)) % 2 == 0 else "sombre"
            acc[classe].append(image[y, x, :3])
        for classe, valeurs in acc.items():
            if valeurs:
                tables[classe].append((y, np.median(np.array(valeurs), axis=0)))
    return tables


def degrade(ident: str, table) -> str:
    arrets = []
    for y, c in table:
        r, g, b = (int(round(v)) for v in c)
        arrets.append(f'<stop offset="{(y - Y_MIN) / (Y_MAX - Y_MIN):.4f}" stop-color="#{r:02x}{g:02x}{b:02x}"/>')
    return (
        f'<linearGradient id="{ident}" gradientUnits="userSpaceOnUse" x1="0" y1="{Y_MIN}" x2="0" y2="{Y_MAX}">'
        + "".join(arrets)
        + "</linearGradient>"
    )


def decoupe(image: np.ndarray) -> str:
    """Contour de la découpe (sous le miroir), relevé dans la transparence."""
    gauche, droite = [], []
    for y in range(4, 80, 2):
        xx = np.nonzero(image[y, 300:1200, 3] < 128)[0]
        if len(xx):
            gauche.append((300 + xx.min(), y))
            droite.append((300 + xx.max(), y))
    points = [(gauche[0][0], Y_MIN - 1)] + gauche + droite[::-1] + [(droite[0][0], Y_MIN - 1)]
    return " ".join(f"{x:.0f},{y:.1f}" for x, y in points)


def main(source: str, sortie: str) -> None:
    image = np.asarray(Image.open(source).convert("RGBA")).astype(float)
    tables = couleurs(image)
    polys = []
    for r in range(-8, 6):
        y0, y1 = max(y_de_v(r), Y_MIN), min(y_de_v(r + 1), Y_MAX + 50)
        if y1 <= Y_MIN or y0 >= Y_MAX:
            continue
        s0, s1 = PENTE * (y0 - YV), PENTE * (y1 - YV)
        for j in range(-40, 41):
            if (j + r) % 2:
                continue
            xs = [XV + j * s0, XV + (j + 1) * s0, XV + (j + 1) * s1, XV + j * s1]
            if max(xs) < X_MIN or min(xs) > X_MAX:
                continue
            polys.append(
                f'<path d="M{xs[0]:.1f} {y0:.1f}L{xs[1]:.1f} {y0:.1f}L{xs[2]:.1f} {y1:.1f}L{xs[3]:.1f} {y1:.1f}Z"/>'
            )
    largeur, hauteur = X_MAX - X_MIN, Y_MAX - Y_MIN
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{X_MIN} {Y_MIN} {largeur} {hauteur}" '
        f'width="{largeur:.0f}" height="{hauteur:.0f}" preserveAspectRatio="none">'
        "<defs>"
        + degrade("clair", tables["clair"])
        + degrade("sombre", tables["sombre"])
        + f'<mask id="decoupe" maskUnits="userSpaceOnUse" x="{X_MIN}" y="{Y_MIN}" width="{largeur}" height="{hauteur}">'
        f'<rect x="{X_MIN}" y="{Y_MIN}" width="{largeur}" height="{hauteur}" fill="#fff"/>'
        f'<polygon points="{decoupe(image)}" fill="#000"/></mask>'
        "</defs>"
        '<g mask="url(#decoupe)">'
        f'<rect x="{X_MIN}" y="{Y_MIN}" width="{largeur}" height="{hauteur}" fill="url(#sombre)"/>'
        '<g fill="url(#clair)">' + "".join(polys) + "</g></g></svg>"
    )
    with open(sortie, "w", encoding="utf-8") as f:
        f.write(svg)
    print(f"{sortie} : {len(svg) // 1024} Ko, {len(polys)} carreaux clairs")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
