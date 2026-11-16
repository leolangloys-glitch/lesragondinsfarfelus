"""Fabrique les images de partage (réseaux sociaux, Google) à partir des photos du site.

    python3 -I outils/images-partage.py

- public/partage/<page>.jpg : 1200 × 630, photo recadrée, dégradé et logo en bas à gauche ;
- public/partage/festival-16x9.jpg, -4x3.jpg, -1x1.jpg : images de l'événement pour
  Google (données structurées « Festival »), sans texte.
À relancer si on change une photo source (liste PAGES ci-dessous).
"""
import pathlib
from PIL import Image, ImageOps

RACINE = pathlib.Path(__file__).resolve().parent.parent
PUBLIC = RACINE / "public"
SORTIE = PUBLIC / "partage"
LOGO = PUBLIC / "brouillon" / "logo.webp"

# page -> (photo source, position verticale du cadrage : 0 = haut, 0.5 = centre, 1 = bas)
PAGES = {
    "programmation": ("medias/souvenirs/2026-concert-scene.webp", 0.45),
    "domaine": ("medias/domaine/forteresse-nuit.webp", 0.5),
    "edition-2026": ("medias/souvenirs/2026-manoir-projections.webp", 0.45),
    "benevoles": ("medias/benevoles/2026-danse.webp", 0.4),
    "partenaires": ("medias/domaine/cours-illuminees.webp", 0.5),
    "infos": ("medias/domaine/panorama.webp", 0.6),
    "venir": ("medias/domaine/panorama.webp", 0.6),
    "billetterie": ("medias/souvenirs/2026-concert-nuit.webp", 0.5),
    "cashless": ("medias/souvenirs/2026-allee-illuminee.webp", 0.55),
    "presse": ("medias/souvenirs/2026-regie.webp", 0.5),
    "lettres": ("medias/souvenirs/2026-concert-guitare.webp", 0.4),
}
EVENEMENT = ("medias/souvenirs/2026-concert-scene.webp", 0.45)


def recadrer(image: Image.Image, largeur: int, hauteur: int, vertical: float) -> Image.Image:
    return ImageOps.fit(image, (largeur, hauteur), Image.LANCZOS, centering=(0.5, vertical))


def avec_logo(image: Image.Image) -> Image.Image:
    l, h = image.size
    # Dégradé sombre en bas, pour que le logo se lise sur toutes les photos
    degrade = Image.new("L", (1, h))
    for y in range(h):
        t = max(0.0, (y / h - 0.45) / 0.55)
        degrade.putpixel((0, y), int(215 * t ** 1.4))
    noir = Image.new("RGB", (l, h), (4, 22, 22))
    image = Image.composite(noir, image, degrade.resize((l, h)))
    logo = Image.open(LOGO).convert("RGBA")
    logo.thumbnail((380, 230), Image.LANCZOS)
    image.paste(logo, (56, h - logo.height - 44), logo)
    return image


def main() -> None:
    SORTIE.mkdir(exist_ok=True)
    for page, (source, vertical) in PAGES.items():
        photo = ImageOps.exif_transpose(Image.open(PUBLIC / source)).convert("RGB")
        avec_logo(recadrer(photo, 1200, 630, vertical)).save(SORTIE / f"{page}.jpg", quality=84, optimize=True, progressive=True)
        print(f"partage/{page}.jpg")
    photo = ImageOps.exif_transpose(Image.open(PUBLIC / EVENEMENT[0])).convert("RGB")
    for nom, (l, h) in {"16x9": (1600, 900), "4x3": (1600, 1200), "1x1": (1200, 1200)}.items():
        recadrer(photo, l, h, EVENEMENT[1]).save(SORTIE / f"festival-{nom}.jpg", quality=84, optimize=True, progressive=True)
        print(f"partage/festival-{nom}.jpg")


if __name__ == "__main__":
    main()
