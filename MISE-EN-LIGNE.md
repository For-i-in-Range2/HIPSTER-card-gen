# Mettre le jeu en ligne (une seule fois)

Le jeu est publié sur GitHub Pages (HTTPS gratuit, déjà sur ce dépôt). Ton père
n'a alors rien à installer : il ajoute une icône à son écran d'accueil.

Prérequis : le dépôt doit être **public** (Pages gratuit).

## 1. Envoyer les changements

```bash
git add -A
git commit -m "Jeu installable (PWA) + publication GitHub Pages"
git push
```

## 2. Activer GitHub Pages

1. Dépôt GitHub > Settings > Pages.
2. Build and deployment > Source > **GitHub Actions**.
3. Onglet Actions : attends la fin du workflow « Deploy game to GitHub Pages ».
4. L'adresse du jeu s'affiche dans Settings > Pages, du type :
   `https://for-i-in-range2.github.io/HIPSTER-card-gen/`
   Copie-la exactement (slash final compris).

## 3. Autoriser cette adresse dans Spotify

1. https://developer.spotify.com/dashboard > ouvre ton app.
2. Settings > Edit > Redirect URIs > Add > colle l'adresse de l'étape 2.
   (Garde aussi `http://127.0.0.1:8080/` pour jouer en local.)
3. Save.

## Ensuite

- Envoie à ton père l'adresse du jeu + `game/COMMENT-INSTALLER.md`.
- Pour publier une modif : `git push` (GitHub republie seul). Monte le numéro de
  version dans `game/sw.js` (`hitster-v1` -> `v2`) pour forcer la mise à jour sur
  les téléphones déjà installés.

## Fichiers ajoutés pour tout ça

- `.github/workflows/pages.yml` : publie `game/` sur Pages à chaque push.
- `game/manifest.webmanifest`, `game/sw.js`, `game/icons/` : rendent le jeu
  installable (icône, plein écran, chargement instantané).
- `game/index.html`, `game/config.js` : balises PWA + Redirect URI calculée
  automatiquement (même code en ligne et en local).
