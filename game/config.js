function currentRedirectUri() {
  const u = new URL(window.location.href);
  u.hash = "";
  u.search = "";
  u.pathname = u.pathname.replace(/index\.html$/, "");
  if (!u.pathname.endsWith("/")) u.pathname += "/";
  return u.origin + u.pathname;
}

export const CONFIG = {
  SPOTIFY_CLIENT_ID: "8eebf9ac4060443e9cd1d740c030b9a1",
  REDIRECT_URI: currentRedirectUri(),
  CARDS_TO_WIN: 10,
  DEMO_MODE: false,
};
