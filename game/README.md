# 🎵 Hitster Maison — le jeu

Une web app qui rejoue le principe de Hitster **avec tes propres playlists** :
elle scanne les cartes QR (celles générées par `generate_cards.py` dans le
dossier parent), joue la chanson **sans afficher le titre**, et te laisse la
placer dans ta frise chronologique. La bonne année est révélée à la validation.

Aucun serveur, aucun build : ce sont des fichiers statiques (HTML/CSS/JS).

---

## Essayer tout de suite (mode démo, sans Spotify)

Depuis le dossier `hipster card` :

```
python3 -m http.server 8080 --bind 127.0.0.1 -d game
```

Puis ouvre **http://127.0.0.1:8080/** dans ton navigateur. En mode démo, une
petite liste de chansons de test remplace Spotify (pas de son, juste la
mécanique). Ajoute des joueurs, pioche, place, valide — c'est jouable.

---

## Passer en mode réel (Spotify Premium)

### 1. Créer une app Spotify (5 min, gratuit)

1. Va sur **https://developer.spotify.com/dashboard** et connecte-toi.
2. **Create app** :
   - *App name* : `Hitster Maison` (ce que tu veux)
   - *Redirect URI* : `http://127.0.0.1:8080/` — **exactement** ça, slash final compris
   - *Which API/SDKs* : coche **Web Playback SDK**
3. Ouvre l'app créée → **Settings** → copie le **Client ID**.
   (Le *Client Secret* est inutile ici : on utilise le flux PKCE.)

### 2. Renseigner le Client ID

Dans [config.js](config.js) :

```js
SPOTIFY_CLIENT_ID: "colle_ton_client_id_ici",
DEMO_MODE: false,
```

### 3. Lancer et jouer

```
python3 -m http.server 8080 --bind 127.0.0.1 -d game
```

Ouvre **http://127.0.0.1:8080/** → **Se connecter à Spotify** → autorise.
L'appareil sur lequel tu ouvres le jeu devient le « lecteur » : il faut qu'il
soit connecté à un compte **Premium** (le Web Playback SDK l'exige).

> ⚠️ L'adresse doit être **`127.0.0.1`** (pas `localhost`) pour correspondre à
> la Redirect URI, et parce que Spotify exige un contexte sécurisé.

---

## Comment on joue

1. Chaque joueur construit sa **frise** (des cartes rangées par année).
2. À ton tour : **Scanner une carte** → vise le QR → la chanson démarre
   (titre masqué).
3. Place la carte au bon endroit dans ta frise (avant / entre / après tes
   cartes), puis **Valider**.
4. L'année et le titre se révèlent. Bien placé → tu gardes la carte.
   Premier à **10 cartes** (réglable dans `config.js`) gagne.

💡 *Astuce anti-triche* : celui qui scanne pose le téléphone face cachée
pendant que ça joue, pour que personne ne voie le titre.

---

## Fabriquer les cartes

Les cartes se génèrent avec le script du dossier parent : voir le
[README principal](../README.md). Le QR de chaque carte contient directement
le lien Spotify du morceau, donc le scanner du jeu sait quoi jouer.

---

## Limites connues

- **Scan caméra** : utilise l'API `BarcodeDetector`, dispo sur Chrome/Android
  et Safari iOS 17+. Sur les navigateurs plus anciens, utilise « Saisir un
  lien à la main » (repli intégré).
- **Premium obligatoire** pour la lecture en jeu (contrainte Spotify, pas la
  nôtre). L'appareil « lecteur » doit être Premium ; les autres joueurs non.
- Partie en **hot-seat** (on se passe le téléphone). Le multi-appareils en
  réseau pourrait venir plus tard.

## Structure du code

| Fichier         | Rôle                                                        |
|-----------------|-------------------------------------------------------------|
| `index.html`    | page + chargement du SDK Spotify                            |
| `config.js`     | Client ID, mode démo, règles (cartes pour gagner)           |
| `app.js`        | logique de jeu, écrans, machine à états                     |
| `spotify.js`    | connexion OAuth (PKCE) + lecture via Web Playback SDK       |
| `scanner.js`    | scan du QR via la caméra + extraction de l'ID Spotify       |
| `demo-cards.js` | liste de chansons pour le mode démo                         |
| `style.css`     | mise en forme                                               |
