import { CONFIG } from "./config.js";
import { DEMO_CARDS } from "./demo-cards.js";
import * as spotify from "./spotify.js";
import { startCamera, extractTrackId, barcodeSupported } from "./scanner.js";

const app = document.getElementById("app");

const state = {
  players: [],
  current: 0,
  phase: "home",
  card: null,
  chosenSlot: null,
  correct: null,
  deck: [],
  spotifyReady: false,
  stopCamera: null,
};

const el = (html) => {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const sortedTimeline = (p) => [...p.timeline].sort((a, b) => a.year - b.year);

function isPlacementCorrect(timeline, card, slot) {
  const tl = [...timeline].sort((a, b) => a.year - b.year);
  const left = slot > 0 ? tl[slot - 1].year : -Infinity;
  const right = slot < tl.length ? tl[slot].year : Infinity;
  return card.year >= left && card.year <= right;
}

function renderHome() {
  state.phase = "home";
  const needsSpotify = !CONFIG.DEMO_MODE;
  const connected = !needsSpotify || spotify.isLoggedIn();

  app.replaceChildren(el(`
    <div class="screen">
      <h1>🎵 Hitster Maison</h1>
      <p class="subtitle">Devine l'année de sortie et construis ta frise musicale.</p>

      ${CONFIG.DEMO_MODE ? `<div class="badge">Mode démo (sans Spotify)</div>` : ""}

      ${needsSpotify && !connected ? `
        <button id="connect" class="btn btn-spotify">Se connecter à Spotify</button>
        <p class="hint">Compte Premium requis pour la lecture.</p>
      ` : ""}

      ${connected ? `
        <div class="card-panel">
          <h2>Joueurs</h2>
          <div id="players"></div>
          <div class="row">
            <input id="new-player" placeholder="Nom du joueur" maxlength="20" />
            <button id="add-player" class="btn btn-small">Ajouter</button>
          </div>
        </div>
        <button id="start" class="btn btn-primary">Commencer la partie</button>
      ` : ""}
    </div>
  `));

  if (needsSpotify && !connected) {
    app.querySelector("#connect").onclick = () => spotify.login();
    return;
  }

  const playersDiv = app.querySelector("#players");
  const drawPlayers = () => {
    playersDiv.replaceChildren(...state.players.map((p, i) =>
      el(`<div class="player-row"><span>${escapeHtml(p.name)}</span>
           <button data-i="${i}" class="btn-x">✕</button></div>`)));
    playersDiv.querySelectorAll(".btn-x").forEach((b) =>
      b.onclick = () => { state.players.splice(+b.dataset.i, 1); drawPlayers(); });
  };
  drawPlayers();

  const input = app.querySelector("#new-player");
  const addPlayer = () => {
    const name = input.value.trim();
    if (!name) return;
    state.players.push({ name, timeline: [] });
    input.value = "";
    drawPlayers();
    input.focus();
  };
  app.querySelector("#add-player").onclick = addPlayer;
  input.onkeydown = (e) => { if (e.key === "Enter") addPlayer(); };

  app.querySelector("#start").onclick = startGame;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function startGame() {
  if (state.players.length < 1) { alert("Ajoute au moins un joueur."); return; }

  if (CONFIG.DEMO_MODE) {
    state.deck = shuffle(DEMO_CARDS);
  } else if (!state.spotifyReady) {
    try {
      app.replaceChildren(el(`<div class="screen"><p>Connexion au lecteur Spotify…</p></div>`));
      await spotify.initPlayer();
      state.spotifyReady = true;
    } catch (e) {
      alert("Lecteur Spotify indisponible : " + e.message);
      renderHome();
      return;
    }
  }

  for (const p of state.players) {
    const c = await nextCardForStart();
    if (c) p.timeline = [c];
  }

  state.current = 0;
  renderDraw();
}

async function nextCardForStart() {
  if (CONFIG.DEMO_MODE) return state.deck.pop() || null;
  return null;
}

function renderDraw() {
  state.phase = "draw";
  state.card = null;
  state.chosenSlot = null;
  state.correct = null;
  const p = state.players[state.current];

  app.replaceChildren(el(`
    <div class="screen">
      <div class="turn-head">C'est au tour de <strong>${escapeHtml(p.name)}</strong></div>
      <p class="subtitle">${p.timeline.length} carte(s) dans ta frise • objectif ${CONFIG.CARDS_TO_WIN}</p>

      ${CONFIG.DEMO_MODE ? `
        <button id="draw" class="btn btn-primary btn-big">🎴 Piocher une carte</button>
      ` : `
        <div id="scan-area">
          <button id="scan" class="btn btn-primary btn-big">📷 Scanner une carte</button>
          <video id="video" playsinline muted></video>
        </div>
        <details class="manual">
          <summary>Saisir un lien à la main</summary>
          <div class="row">
            <input id="manual-link" placeholder="https://open.spotify.com/track/…" />
            <button id="manual-go" class="btn btn-small">OK</button>
          </div>
        </details>
      `}
      ${renderTimelineHTML(p, false)}
    </div>
  `));

  if (CONFIG.DEMO_MODE) {
    app.querySelector("#draw").onclick = drawDemoCard;
  } else {
    app.querySelector("#scan").onclick = beginScan;
    app.querySelector("#manual-go").onclick = () => {
      const id = extractTrackId(app.querySelector("#manual-link").value);
      if (id) onCardScanned(id);
      else alert("Lien Spotify non reconnu.");
    };
  }
}

function drawDemoCard() {
  if (state.deck.length === 0) state.deck = shuffle(DEMO_CARDS);
  state.card = state.deck.pop();
  renderPlacing();
}

async function beginScan() {
  const video = app.querySelector("#video");
  const scanBtn = app.querySelector("#scan");
  if (!barcodeSupported()) {
    alert("Le scan caméra n'est pas supporté par ce navigateur.\n" +
          "Utilise « Saisir un lien à la main », ou Chrome sur Android.");
    return;
  }
  scanBtn.textContent = "Vise le QR code…";
  video.classList.add("active");
  state.stopCamera = await startCamera(
    video,
    (raw) => {
      const id = extractTrackId(raw);
      if (id) { stopScan(); onCardScanned(id); }
    },
    (err) => {
      stopScan();
      alert(err.message === "camera"
        ? "Accès caméra refusé."
        : "Scan indisponible sur ce navigateur.");
    }
  );
}

function stopScan() {
  state.stopCamera?.();
  state.stopCamera = null;
}

async function onCardScanned(trackId) {
  try {
    app.querySelector("#scan")?.replaceWith(el(`<p class="subtitle">Chargement…</p>`));
    const card = await spotify.getTrack(trackId);
    if (!card.year) throw new Error("Année de sortie introuvable pour cette piste.");
    state.card = card;
    await spotify.playTrack(card.uri);
    renderPlacing();
  } catch (e) {
    alert("Impossible de charger la carte : " + e.message);
    renderDraw();
  }
}

function renderPlacing() {
  state.phase = "placing";
  const p = state.players[state.current];

  app.replaceChildren(el(`
    <div class="screen">
      <div class="turn-head"><strong>${escapeHtml(p.name)}</strong> — place la carte</div>
      <div class="now-playing">
        <span class="pulse">♪</span> Lecture en cours…
        ${CONFIG.DEMO_MODE ? `<span class="demo-note">(démo : pas de son)</span>` : ""}
      </div>
      <p class="subtitle">Choisis où cette chanson se situe dans le temps :</p>
      ${renderTimelineHTML(p, true)}
      <button id="validate" class="btn btn-primary" disabled>Valider ma réponse</button>
    </div>
  `));

  bindSlots();
  app.querySelector("#validate").onclick = validatePlacement;
}

function renderTimelineHTML(player, withSlots) {
  const tl = sortedTimeline(player);
  let html = `<div class="timeline ${withSlots ? "interactive" : ""}">`;

  const slot = (i) => withSlots
    ? `<button class="slot" data-slot="${i}" aria-label="ici">+</button>` : "";

  html += slot(0);
  tl.forEach((c, i) => {
    html += `
      <div class="tl-card">
        <div class="tl-year">${c.year}</div>
        <div class="tl-meta">${escapeHtml(c.artist)}<br><span>${escapeHtml(c.title)}</span></div>
      </div>`;
    html += slot(i + 1);
  });

  if (tl.length === 0 && !withSlots) html += `<div class="tl-empty">Frise vide</div>`;
  html += `</div>`;
  return html;
}

function bindSlots() {
  const slots = app.querySelectorAll(".slot");
  slots.forEach((s) => s.onclick = () => {
    slots.forEach((x) => x.classList.remove("chosen"));
    s.classList.add("chosen");
    state.chosenSlot = +s.dataset.slot;
    app.querySelector("#validate").disabled = false;
  });
}

async function validatePlacement() {
  const p = state.players[state.current];
  state.correct = isPlacementCorrect(p.timeline, state.card, state.chosenSlot);
  if (state.correct) p.timeline.push(state.card);
  if (!CONFIG.DEMO_MODE) await spotify.pause();
  renderReveal();
}

function renderReveal() {
  state.phase = "revealed";
  const p = state.players[state.current];
  const c = state.card;
  const won = p.timeline.length >= CONFIG.CARDS_TO_WIN;

  app.replaceChildren(el(`
    <div class="screen">
      <div class="reveal ${state.correct ? "ok" : "ko"}">
        <div class="reveal-badge">${state.correct ? "✅ Bien placé !" : "❌ Raté"}</div>
        <div class="reveal-year">${c.year}</div>
        <div class="reveal-artist">${escapeHtml(c.artist)}</div>
        <div class="reveal-title">${escapeHtml(c.title)}</div>
      </div>
      ${state.correct
        ? `<p class="subtitle">La carte rejoint ta frise (${p.timeline.length}/${CONFIG.CARDS_TO_WIN}).</p>`
        : `<p class="subtitle">La carte est défaussée.</p>`}
      ${renderTimelineHTML(p, false)}
      <button id="next" class="btn btn-primary">
        ${won ? "🏆 Voir le résultat" : "Joueur suivant →"}
      </button>
    </div>
  `));

  app.querySelector("#next").onclick = () => {
    if (won) { renderWin(p); return; }
    state.current = (state.current + 1) % state.players.length;
    renderDraw();
  };
}

function renderWin(winner) {
  state.phase = "win";
  app.replaceChildren(el(`
    <div class="screen">
      <h1>🏆 ${escapeHtml(winner.name)} gagne !</h1>
      <p class="subtitle">${winner.timeline.length} cartes bien alignées.</p>
      ${renderTimelineHTML(winner, false)}
      <button id="again" class="btn btn-primary">Rejouer</button>
    </div>
  `));
  app.querySelector("#again").onclick = () => {
    state.players.forEach((p) => (p.timeline = []));
    startGame();
  };
}

async function boot() {
  if (!CONFIG.DEMO_MODE) {
    try {
      const returned = await spotify.handleRedirect();
      if (returned) {}
    } catch (e) {
      alert(e.message);
    }
  }
  renderHome();
}

boot();
