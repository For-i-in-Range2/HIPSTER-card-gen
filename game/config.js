// -----------------------------------------------------------------------------
//  Configuration du jeu
// -----------------------------------------------------------------------------
//  1. Va sur https://developer.spotify.com/dashboard  (connexion avec ton compte)
//  2. "Create app" :
//       - App name        : Hitster Maison (ce que tu veux)
//       - API à cocher    : "Web Playback SDK"
//  3. Ajoute DEUX "Redirect URIs" (bouton "Add" pour chacune) :
//       - http://127.0.0.1:8080/                                  (jeu en local)
//       - https://for-i-in-range2.github.io/HIPSTER-card-gen/     (jeu en ligne)
//     Copie l'adresse EXACTE affichée par GitHub Pages une fois activé
//     (Settings > Pages) et colle-la telle quelle, slash final compris.
//  4. Copie le "Client ID" et colle-le ci-dessous.
//
//  Pas besoin du "Client Secret" : on utilise le flux PKCE, prévu pour les
//  applis web sans serveur. Le Client ID n'est pas un secret.
// -----------------------------------------------------------------------------

// La Redirect URI est calculée automatiquement à partir de l'adresse d'ouverture
// du jeu : le dossier courant, sans "index.html", ni "?...", ni "#...".
//   • en local  → http://127.0.0.1:8080/
//   • en ligne  → https://for-i-in-range2.github.io/HIPSTER-card-gen/
// Le même code marche donc partout ; il suffit d'enregistrer ces adresses dans
// le dashboard Spotify (voir ci-dessus).
function currentRedirectUri() {
  const u = new URL(window.location.href);
  u.hash = "";
  u.search = "";
  u.pathname = u.pathname.replace(/index\.html$/, "");
  if (!u.pathname.endsWith("/")) u.pathname += "/";
  return u.origin + u.pathname;
}

export const CONFIG = {
  // Ton identifiant d'application Spotify (obligatoire pour le mode réel) :
  SPOTIFY_CLIENT_ID: "177da32124814750a992ddea6266fb12",

  // Calculée automatiquement (voir currentRedirectUri ci-dessus).
  REDIRECT_URI: currentRedirectUri(),

  // Nombre de cartes à aligner pour gagner
  CARDS_TO_WIN: 10,

  DEMO_MODE: false,
};
