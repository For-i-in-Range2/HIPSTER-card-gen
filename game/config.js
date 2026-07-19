// -----------------------------------------------------------------------------
//  Configuration du jeu
// -----------------------------------------------------------------------------
//  1. Va sur https://developer.spotify.com/dashboard  (connexion avec ton compte)
//  2. "Create app" :
//       - App name        : Hitster Maison (ce que tu veux)
//       - Redirect URI    : http://127.0.0.1:8080/    (EXACTEMENT ça)
//       - API à cocher    : "Web Playback SDK"
//  3. Copie le "Client ID" et colle-le ci-dessous.
//
//  Pas besoin du "Client Secret" : on utilise le flux PKCE, prévu pour les
//  applis web sans serveur. Le Client ID n'est pas un secret.
// -----------------------------------------------------------------------------

export const CONFIG = {
  // Ton identifiant d'application Spotify (obligatoire pour le mode réel) :
  SPOTIFY_CLIENT_ID: "177da32124814750a992ddea6266fb12",

  // Doit correspondre EXACTEMENT à la Redirect URI enregistrée sur le dashboard
  // ET à l'adresse à laquelle tu ouvres le jeu.
  REDIRECT_URI: "http://127.0.0.1:8080/",

  // Nombre de cartes à aligner pour gagner
  CARDS_TO_WIN: 10,

  DEMO_MODE: false,
};
