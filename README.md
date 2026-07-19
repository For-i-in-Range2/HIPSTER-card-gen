# Cartes Hitster maison 🎵

Génère un PDF de cartes à imprimer : un QR code d'un côté (il ouvre la chanson
dans Spotify quand on le scanne avec l'appareil photo du téléphone), et
**année / artiste / titre** de l'autre côté.

## 1. Préparer le fichier `chansons.csv`

Ouvre [chansons.csv](chansons.csv) avec Excel, LibreOffice ou un éditeur de texte.
Une ligne par chanson, 4 colonnes :

| colonne   | contenu                                      |
|-----------|----------------------------------------------|
| `url`     | le lien Spotify de la chanson                |
| `artiste` | le nom de l'artiste                          |
| `titre`   | le titre de la chanson                       |
| `annee`   | l'année de sortie (celle à deviner au jeu !) |

Le séparateur peut être `;` (Excel français) ou `,` — les deux marchent.

**Pour récupérer le lien Spotify** : dans l'appli Spotify, sur la chanson →
`⋯` → **Partager** → **Copier le lien vers le titre**. Colle-le dans la
colonne `url` (le script nettoie automatiquement le `?si=...` à la fin).

💡 Astuce Hitster : l'année qui compte est celle de la **sortie originale** de
la chanson, pas celle de la compilation/remasterisation que Spotify affiche
parfois. Vérifie pour les vieux titres.

## 2. Générer le PDF

```
python3 generate_cards.py chansons.csv
```

Cela crée `cartes.pdf` : 12 cartes de 65 × 65 mm par page A4
(page 1 = QR codes, page 2 = les infos correspondantes en miroir, etc.).

Autre nom de sortie : `python3 generate_cards.py chansons.csv -o soiree.pdf`

## 3. Imprimer et découper

1. Imprime le PDF en **recto-verso**, option **« Retourner sur les bords longs »**.
2. Échelle **100 %** (pas d'« ajuster à la page »).
3. Vérifie sur la première feuille que le petit `n°` au dos correspond bien
   à celui sous le QR code — c'est le contrôle d'alignement.
4. Découpe le long des traits gris. Papier épais (200 g+) recommandé,
   ou colle la feuille sur du carton avant découpe.

## Règles du jeu (rappel rapide)

Chaque joueur construit une frise chronologique devant lui. À son tour, on
scanne le QR d'une nouvelle carte, la musique se lance, et il faut placer la
carte au bon endroit dans sa frise (avant/après/entre ses cartes) **avant** de
la retourner. Bien placé → on garde la carte. Premier à 10 cartes gagne !
