function currentRedirectUri() {
  const u = new URL(window.location.href);
  u.hash = "";
  u.search = "";
  u.pathname = u.pathname.replace(/index\.html$/, "");
  if (!u.pathname.endsWith("/")) u.pathname += "/";
  return u.origin + u.pathname;
}

export const CONFIG = {
  SPOTIFY_CLIENT_ID: "177da32124814750a992ddea6266fb12",
  REDIRECT_URI: currentRedirectUri(),
  CARDS_TO_WIN: 10,
  DEMO_MODE: false,
};
