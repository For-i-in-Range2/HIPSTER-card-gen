import { CONFIG } from "./config.js";

const SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-modify-playback-state",
  "user-read-playback-state",
].join(" ");

const TOKEN_KEY = "hitster_token";

function randomString(len) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

async function sha256(str) {
  const data = new TextEncoder().encode(str);
  return crypto.subtle.digest("SHA-256", data);
}

function base64url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function saveToken(data) {
  data.expires_at = Date.now() + (data.expires_in - 60) * 1000;
  localStorage.setItem(TOKEN_KEY, JSON.stringify(data));
}

function loadToken() {
  try { return JSON.parse(localStorage.getItem(TOKEN_KEY)); }
  catch { return null; }
}

export function isLoggedIn() {
  return !!loadToken();
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function login() {
  const verifier = randomString(64);
  const challenge = base64url(await sha256(verifier));
  sessionStorage.setItem("pkce_verifier", verifier);

  const params = new URLSearchParams({
    client_id: CONFIG.SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: CONFIG.REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: "S256",
    code_challenge: challenge,
  });
  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
}

export async function handleRedirect() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  if (error) throw new Error("Autorisation Spotify refusée : " + error);
  if (!code) return false;

  const verifier = sessionStorage.getItem("pkce_verifier");
  const body = new URLSearchParams({
    client_id: CONFIG.SPOTIFY_CLIENT_ID,
    grant_type: "authorization_code",
    code,
    redirect_uri: CONFIG.REDIRECT_URI,
    code_verifier: verifier,
  });
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error("Échange du token échoué : " + (await res.text()));
  saveToken(await res.json());

  window.history.replaceState({}, document.title, CONFIG.REDIRECT_URI);
  return true;
}

async function refreshToken() {
  const token = loadToken();
  if (!token?.refresh_token) throw new Error("Reconnexion nécessaire.");
  const body = new URLSearchParams({
    client_id: CONFIG.SPOTIFY_CLIENT_ID,
    grant_type: "refresh_token",
    refresh_token: token.refresh_token,
  });
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error("Rafraîchissement du token échoué.");
  const data = await res.json();
  data.refresh_token = data.refresh_token || token.refresh_token;
  saveToken(data);
  return data.access_token;
}

async function getAccessToken() {
  const token = loadToken();
  if (!token) throw new Error("Non connecté.");
  if (Date.now() >= token.expires_at) return refreshToken();
  return token.access_token;
}

async function api(path, options = {}) {
  const accessToken = await getAccessToken();
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`Spotify API ${res.status} : ${await res.text()}`);
  return res.json();
}

export async function getTrack(trackId) {
  const t = await api(`/tracks/${trackId}`);
  const year = parseInt((t.album?.release_date || "0").slice(0, 4), 10);
  return {
    trackId,
    uri: t.uri,
    title: t.name,
    artist: t.artists.map((a) => a.name).join(", "),
    year: Number.isFinite(year) ? year : null,
    releaseDate: t.album?.release_date || "",
  };
}

let player = null;
let deviceId = null;

export function initPlayer() {
  return new Promise((resolve, reject) => {
    const start = () => {
      player = new Spotify.Player({
        name: "Hitster Maison",
        getOAuthToken: (cb) => getAccessToken().then(cb),
        volume: 0.8,
      });
      player.addListener("ready", ({ device_id }) => {
        deviceId = device_id;
        resolve(device_id);
      });
      player.addListener("initialization_error", ({ message }) => reject(new Error(message)));
      player.addListener("authentication_error", ({ message }) => reject(new Error(message)));
      player.addListener("account_error", () =>
        reject(new Error("Un compte Spotify Premium est requis pour la lecture.")));
      player.connect();
    };

    if (window.Spotify) start();
    else window.onSpotifyWebPlaybackSDKReady = start;
  });
}

export async function playTrack(uri) {
  if (!deviceId) throw new Error("Lecteur Spotify pas prêt.");
  await api(`/me/player/play?device_id=${deviceId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uris: [uri] }),
  });
}

export async function pause() {
  try { await player?.pause(); } catch {}
}

export async function resume() {
  try { await player?.resume(); } catch {}
}
