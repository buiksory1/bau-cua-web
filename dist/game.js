const ITEMS = {
  0: { name: "TÔM", tile: "dice_nai.webp", cube: "item_tom.webp" },
  1: { name: "CUA", tile: "dice_bau.webp", cube: "item_bau.webp" },
  2: { name: "CÁ", tile: "dice_cua.webp", cube: "item_cua.webp" },
  3: { name: "GÀ", tile: "dice_ca.webp", cube: "item_nai.webp" },
  4: { name: "BẦU", tile: "dice_tom.webp", cube: "item_ca.webp" },
  5: { name: "NAI", tile: "dice_ga.webp", cube: "item_ga.webp" },
};

const GRID_ORDER = [[5, 4, 3], [2, 1, 0]];
const ASSET_ROOT = "assets/";
const IMAGE_ASSETS = [
  "bat.webp",
  "dia.webp",
  "icon.png",
  ...["bau", "ca", "cua", "ga", "nai", "tom"].flatMap((name) => [
    `dice_${name}.webp`,
    `item_${name}.webp`,
  ]),
];

const state = {
  dice: [4, 4, 4],
  previousDice: [4, 4, 4],
  lidOpen: true,
  shaking: false,
  soundEnabled: true,
  // Hai ván đầu tiên random toàn bộ ba xúc xắc, sau đó mới dùng công thức.
  randomRoundsRemaining: 2,
};

const homeScreen = document.querySelector("#homeScreen");
const gameScreen = document.querySelector("#gameScreen");
const playButton = document.querySelector("#playButton");
const homeButton = document.querySelector("#homeButton");
const soundButton = document.querySelector("#soundButton");
const actionButton = document.querySelector("#actionButton");
const lid = document.querySelector("#lid");
const mascotGrid = document.querySelector("#mascotGrid");
const previousResults = document.querySelector("#previousResults");
const shakeAudio = document.querySelector("#shakeAudio");
const diceImages = [0, 1, 2].map((index) => document.querySelector(`#die${index}`));

function asset(name) {
  return `${ASSET_ROOT}${name}`;
}

function preloadImage(name) {
  return new Promise((resolve) => {
    const image = new Image();
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeout);
      resolve();
    };
    const timeout = window.setTimeout(finish, 6_000);
    image.onload = async () => {
      try {
        await Promise.race([
          image.decode?.(),
          new Promise((done) => window.setTimeout(done, 2_000)),
        ]);
      } catch (_) {}
      finish();
    };
    image.onerror = finish;
    image.src = asset(name);
  });
}

async function preloadGameAssets() {
  playButton.disabled = true;
  playButton.textContent = "ĐANG TẢI...";

  const preloadWork = Promise.allSettled([
    ...IMAGE_ASSETS.map(preloadImage),
    fetch(asset("sfx_diceshake.mp3"), { cache: "force-cache" }),
  ]);
  await Promise.race([
    preloadWork,
    new Promise((resolve) => window.setTimeout(resolve, 8_000)),
  ]);

  playButton.disabled = false;
  playButton.textContent = "CHƠI NGAY";
}

function requestGameFullscreen() {
  const root = document.documentElement;
  const request = root.requestFullscreen
    || root.webkitRequestFullscreen
    || root.msRequestFullscreen;
  if (!request || document.fullscreenElement || document.webkitFullscreenElement) return;
  try {
    const pending = request.call(root, { navigationUI: "hide" });
    pending?.catch?.(() => {});
  } catch (_) {}
}

function randomInt(maxExclusive) {
  if (globalThis.crypto?.getRandomValues) {
    const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
    const sample = new Uint32Array(1);
    do globalThis.crypto.getRandomValues(sample); while (sample[0] >= limit);
    return sample[0] % maxExclusive;
  }
  return Math.floor(Math.random() * maxExclusive);
}

function randomValueExcept(excluded) {
  const value = randomInt(5);
  return value >= excluded ? value + 1 : value;
}

function calculateByCurrentRule(currentDice) {
  const sum = currentDice.reduce((total, value) => total + value, 0);
  const x1 = (sum + 3) % 6;
  const calculatedX2 = (sum * 2 + 1) % 6;
  const repeatsPreviousPair = x1 === currentDice[0] && calculatedX2 === currentDice[1];
  const x2 = repeatsPreviousPair ? randomValueExcept(calculatedX2) : calculatedX2;
  const x3 = randomInt(6);
  return [x1, x2, x3];
}

function createTile(id, previous = false) {
  const tile = document.createElement("div");
  tile.className = "mascot-tile";
  tile.dataset.id = String(id);
  if (previous) tile.classList.add("previous-tile");

  const image = document.createElement("img");
  image.src = asset(ITEMS[id].tile);
  image.alt = ITEMS[id].name;
  tile.append(image);

  if (!previous) {
    ["b1", "b2", "b3", "b4"].forEach((className) => {
      const burst = document.createElement("span");
      burst.className = `burst ${className}`;
      burst.hidden = true;
      tile.append(burst);
    });
  }
  return tile;
}

function buildGrid() {
  mascotGrid.replaceChildren();
  GRID_ORDER.forEach((rowIds) => {
    const row = document.createElement("div");
    row.className = "mascot-row";
    rowIds.forEach((id) => row.append(createTile(id)));
    mascotGrid.append(row);
  });
}

function renderPrevious() {
  previousResults.replaceChildren(...state.previousDice.map((id) => createTile(id, true)));
}

function renderDice() {
  state.dice.forEach((id, index) => {
    diceImages[index].src = asset(ITEMS[id].cube);
    diceImages[index].alt = ITEMS[id].name;
  });
}

function renderHighlights() {
  const winningIds = state.lidOpen ? new Set(state.dice) : new Set();
  mascotGrid.querySelectorAll(".mascot-tile").forEach((tile) => {
    const highlighted = winningIds.has(Number(tile.dataset.id));
    tile.classList.toggle("winner", highlighted);
    tile.querySelectorAll(".burst").forEach((burst) => {
      burst.hidden = !highlighted;
    });
  });
}

function renderLid() {
  lid.classList.toggle("is-open", state.lidOpen);
  lid.classList.toggle("is-closed", !state.lidOpen);
  lid.classList.toggle("is-shaking", !state.lidOpen && state.shaking);
}

function renderAction() {
  actionButton.disabled = state.shaking;
  actionButton.textContent = state.lidOpen ? "XÓC" : state.shaking ? "ĐANG XÓC" : "MỞ";
}

function renderAll() {
  renderPrevious();
  renderDice();
  renderHighlights();
  renderLid();
  renderAction();
}

function playShakeFeedback() {
  if (state.soundEnabled) {
    shakeAudio.currentTime = 0;
    shakeAudio.play().catch(() => {});
  }
  if (navigator.vibrate) navigator.vibrate(140);
}

function rollWhileCovered() {
  const usedRandomRound = state.randomRoundsRemaining > 0;
  const nextDice = usedRandomRound
    ? [randomInt(6), randomInt(6), randomInt(6)]
    : calculateByCurrentRule(state.dice);

  if (nextDice[0] === nextDice[1] && nextDice[1] === nextDice[2]) {
    state.randomRoundsRemaining = 1;
  } else if (usedRandomRound) {
    state.randomRoundsRemaining -= 1;
  } else {
    state.randomRoundsRemaining = 0;
  }

  state.dice = nextDice;
  renderDice();
}

function closeAndShake() {
  if (!state.lidOpen || state.shaking) return;
  state.lidOpen = false;
  state.shaking = true;
  renderHighlights();
  renderLid();
  renderAction();
  playShakeFeedback();

  window.setTimeout(rollWhileCovered, 560);
  window.setTimeout(() => {
    state.shaking = false;
    renderLid();
    renderAction();
  }, 1050);
}

function openLid() {
  if (state.lidOpen || state.shaking) return;
  state.lidOpen = true;
  state.previousDice = [...state.dice];
  renderPrevious();
  renderLid();
  renderHighlights();
  renderAction();
}

function showScreen(screen) {
  homeScreen.classList.toggle("is-active", screen === "home");
  gameScreen.classList.toggle("is-active", screen === "game");
}

playButton.addEventListener("click", () => {
  requestGameFullscreen();
  showScreen("game");
  renderAll();
});

homeButton.addEventListener("click", () => showScreen("home"));

soundButton.addEventListener("click", () => {
  state.soundEnabled = !state.soundEnabled;
  soundButton.textContent = state.soundEnabled ? "♪" : "×";
  soundButton.classList.toggle("is-muted", !state.soundEnabled);
  soundButton.setAttribute("aria-label", state.soundEnabled ? "Tắt âm thanh" : "Bật âm thanh");
});

actionButton.addEventListener("click", () => {
  if (state.lidOpen) closeAndShake();
  else openLid();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) shakeAudio.pause();
});

buildGrid();
renderAll();
preloadGameAssets();

if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
