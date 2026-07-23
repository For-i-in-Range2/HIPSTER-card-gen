"""
Générateur de cartes façon Hitster.

Lit un fichier CSV (lien Spotify, artiste, titre, année) et produit un PDF A4
recto/verso prêt à imprimer :
  - pages impaires : QR codes (ouvrent la chanson dans Spotify quand on les scanne)
  - pages paires   : année / artiste / titre, en miroir pour l'impression recto-verso

Usage :
    python3 generate_cards.py chansons.csv
    python3 generate_cards.py chansons.csv -o mes_cartes.pdf
"""

import argparse
import csv
import io
import sys
import unicodedata
from urllib.parse import urlparse

import qrcode
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader, simpleSplit
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas

PAGE_W, PAGE_H = A4
CARD = 65 * mm
COLS, ROWS = 3, 4
GRID_W = COLS * CARD
GRID_H = ROWS * CARD
MARGIN_X = (PAGE_W - GRID_W) / 2
MARGIN_Y = (PAGE_H - GRID_H) / 2
QR_SIZE = 46 * mm

PALETTE = [
    (0.91, 0.30, 0.24),
    (0.16, 0.50, 0.73),
    (0.15, 0.68, 0.38),
    (0.95, 0.61, 0.07),
    (0.61, 0.35, 0.71),
    (0.10, 0.74, 0.61),
]


def strip_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s)
                   if unicodedata.category(c) != "Mn")


HEADER_ALIASES = {
    "url": {"url", "lien", "link", "spotify", "lienspotify", "spotifyurl"},
    "artiste": {"artiste", "artist", "artistes"},
    "titre": {"titre", "title", "chanson", "song", "morceau"},
    "annee": {"annee", "year", "an", "date"},
}


def normalize_header(h: str) -> str:
    h = strip_accents(h.strip().lower()).replace(" ", "").replace("_", "")
    for key, aliases in HEADER_ALIASES.items():
        if h in aliases:
            return key
    return h


def clean_spotify_url(raw: str) -> str:
    """Nettoie le lien Spotify (supprime ?si=..., accepte les URI spotify:track:...)."""
    raw = raw.strip()
    if raw.startswith("spotify:"):
        parts = raw.split(":")
        if len(parts) == 3:
            return f"https://open.spotify.com/{parts[1]}/{parts[2]}"
        return raw
    p = urlparse(raw)
    if "spotify" not in p.netloc:
        print(f"  [!] attention, ce lien ne ressemble pas a un lien Spotify : {raw}")
    return f"{p.scheme}://{p.netloc}{p.path}"


def read_songs(path: str) -> list[dict]:
    with open(path, encoding="utf-8-sig", newline="") as f:
        sample = f.read(4096)
        f.seek(0)
        delimiter = ";" if sample.count(";") >= sample.count(",") else ","
        reader = csv.DictReader(f, delimiter=delimiter)
        reader.fieldnames = [normalize_header(h) for h in reader.fieldnames or []]

        missing = {"url", "artiste", "titre", "annee"} - set(reader.fieldnames)
        if missing:
            sys.exit(f"Colonnes manquantes dans le CSV : {', '.join(sorted(missing))}\n"
                     f"Colonnes attendues : url ; artiste ; titre ; annee")

        songs = []
        for i, row in enumerate(reader, start=2):
            url = (row.get("url") or "").strip()
            if not url:
                continue
            songs.append({
                "url": clean_spotify_url(url),
                "artiste": (row.get("artiste") or "").strip(),
                "titre": (row.get("titre") or "").strip(),
                "annee": (row.get("annee") or "").strip(),
                "num": len(songs) + 1,
            })
    if not songs:
        sys.exit("Aucune chanson trouvée dans le CSV.")
    return songs


def card_origin(col: int, row: int) -> tuple[float, float]:
    """Coin bas-gauche de la carte (col, row), row 0 = rangée du haut."""
    x = MARGIN_X + col * CARD
    y = PAGE_H - MARGIN_Y - (row + 1) * CARD
    return x, y


def draw_cut_grid(c: canvas.Canvas):
    """Traits de découpe fins autour des cartes."""
    c.saveState()
    c.setLineWidth(0.3)
    c.setStrokeColorRGB(0.75, 0.75, 0.75)
    for i in range(COLS + 1):
        x = MARGIN_X + i * CARD
        c.line(x, PAGE_H - MARGIN_Y - GRID_H, x, PAGE_H - MARGIN_Y)
    for j in range(ROWS + 1):
        y = PAGE_H - MARGIN_Y - j * CARD
        c.line(MARGIN_X, y, MARGIN_X + GRID_W, y)
    c.restoreState()


def make_qr_image(url: str) -> ImageReader:
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M,
                       box_size=10, border=0)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return ImageReader(buf)


def draw_qr_card(c: canvas.Canvas, song: dict, col: int, row: int):
    x, y = card_origin(col, row)
    cx = x + CARD / 2

    qr_img = make_qr_image(song["url"])
    qr_y = y + (CARD - QR_SIZE) / 2 + 2 * mm
    c.drawImage(qr_img, cx - QR_SIZE / 2, qr_y, QR_SIZE, QR_SIZE)

    c.setFont("Helvetica-Bold", 8)
    c.setFillColorRGB(0.35, 0.35, 0.35)
    c.drawCentredString(cx, y + 4.5 * mm, "Scanne-moi !")
    c.setFont("Helvetica", 6)
    c.setFillColorRGB(0.6, 0.6, 0.6)
    c.drawCentredString(cx, y + 1.8 * mm, f"n° {song['num']}")


def fitted_font_size(text: str, font: str, max_size: float, max_width: float) -> float:
    size = max_size
    while size > 5 and stringWidth(text, font, size) > max_width:
        size -= 0.5
    return size


def draw_wrapped_centred(c, text, font, max_size, cx, top_y, max_width, leading_ratio=1.15):
    """Dessine le texte centré, sur 2 lignes max, en réduisant la police si besoin."""
    lines = simpleSplit(text, font, max_size, max_width)
    if len(lines) > 2:
        size = max_size
        while size > 6:
            size -= 0.5
            lines = simpleSplit(text, font, size, max_width)
            if len(lines) <= 2:
                break
        max_size = size
        lines = lines[:2]
    c.setFont(font, max_size)
    y = top_y
    for line in lines:
        c.drawCentredString(cx, y, line)
        y -= max_size * leading_ratio
    return y


def draw_info_card(c: canvas.Canvas, song: dict, col: int, row: int):
    x, y = card_origin(col, row)
    cx = x + CARD / 2
    cy = y + CARD / 2
    color = PALETTE[(song["num"] - 1) % len(PALETTE)]
    inner_w = CARD - 10 * mm

    c.setFillColorRGB(0.1, 0.1, 0.1)
    draw_wrapped_centred(c, song["artiste"], "Helvetica-Bold", 11,
                         cx, y + CARD - 10 * mm, inner_w)

    c.setFillColorRGB(*color)
    c.circle(cx, cy, 12.5 * mm, stroke=0, fill=1)
    c.setFillColorRGB(1, 1, 1)
    year = song["annee"]
    c.setFont("Helvetica-Bold", fitted_font_size(year, "Helvetica-Bold", 20, 22 * mm))
    c.drawCentredString(cx, cy - 3 * mm, year)

    c.setFillColorRGB(0.1, 0.1, 0.1)
    lines = simpleSplit(song["titre"], "Helvetica-Oblique", 10, inner_w)
    size = 10
    if len(lines) > 2:
        size = 8
        lines = simpleSplit(song["titre"], "Helvetica-Oblique", size, inner_w)[:2]
    c.setFont("Helvetica-Oblique", size)
    base = y + 8.5 * mm + (len(lines) - 1) * size * 1.15
    for line in lines:
        c.drawCentredString(cx, base, line)
        base -= size * 1.15

    c.setFont("Helvetica", 6)
    c.setFillColorRGB(0.6, 0.6, 0.6)
    c.drawCentredString(cx, y + 1.8 * mm, f"n° {song['num']}")


def generate_pdf(songs: list[dict], out_path: str):
    c = canvas.Canvas(out_path, pagesize=A4)
    per_page = COLS * ROWS

    for start in range(0, len(songs), per_page):
        batch = songs[start:start + per_page]

        draw_cut_grid(c)
        for i, song in enumerate(batch):
            draw_qr_card(c, song, i % COLS, i // COLS)
        c.showPage()

        draw_cut_grid(c)
        for i, song in enumerate(batch):
            draw_info_card(c, song, COLS - 1 - (i % COLS), i // COLS)
        c.showPage()

    c.save()


def main():
    ap = argparse.ArgumentParser(description="Génère des cartes Hitster maison en PDF.")
    ap.add_argument("csv", help="fichier CSV : url ; artiste ; titre ; annee")
    ap.add_argument("-o", "--output", default="cartes.pdf", help="PDF de sortie")
    args = ap.parse_args()

    songs = read_songs(args.csv)
    generate_pdf(songs, args.output)
    pages = -(-len(songs) // (COLS * ROWS)) * 2
    print(f"OK - {len(songs)} cartes generees dans {args.output} ({pages} pages A4).")
    print("  Imprime en recto-verso, option << Retourner sur les bords longs >>, echelle 100 %.")


if __name__ == "__main__":
    main()
