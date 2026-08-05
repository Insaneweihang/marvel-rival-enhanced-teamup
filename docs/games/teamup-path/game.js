const PATCH_MANIFEST_FILE = "../../data/patches.json";

const state = {
  patchId: "",
  heroesByName: new Map(),
  activeHeroes: [],
  teamups: new Map(),
  effects: new Map(),
  pathCache: new Map(),
  puzzle: null,
  playerPath: [],
  gameFinished: false,
  message: "Loading the Team-Up graph...",
  messageType: "info",
};

const elements = {
  startHero: document.querySelector("#start-hero"),
  targetHero: document.querySelector("#target-hero"),
  moveCount: document.querySelector("#move-count"),
  optimalToggle: document.querySelector("#optimal-toggle"),
  optimalPanel: document.querySelector("#optimal-panel"),
  gameStatus: document.querySelector("#game-status"),
  playerPath: document.querySelector("#player-path"),
  choicesHeading: document.querySelector("#choices-heading"),
  heroChoices: document.querySelector("#hero-choices"),
  completionPanel: document.querySelector("#completion-panel"),
  undoButton: document.querySelector("#undo-button"),
  restartButton: document.querySelector("#restart-button"),
  newGameButton: document.querySelector("#new-game-button"),
};

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Unable to load ${path}`);
  }
  return response.json();
}

function getPartners(heroName) {
  return (state.teamups.get(heroName) || []).filter((partner) => state.heroesByName.has(partner));
}

function isPlayable(heroName) {
  const hero = state.heroesByName.get(heroName);
  return Boolean(hero && hero.active !== false);
}

function getPlayablePartners(heroName) {
  return getPartners(heroName).filter(isPlayable);
}

function isValidConnection(heroA, heroB) {
  return getPlayablePartners(heroA).includes(heroB);
}

function effectKey(heroName, partnerName) {
  return `${heroName}|${partnerName}`;
}

function getTeamupEffect(heroName, partnerName) {
  return state.effects.get(effectKey(heroName, partnerName)) || null;
}

function findShortestPath(start, target) {
  if (!isPlayable(start) || !isPlayable(target)) {
    return null;
  }

  const queue = [[start]];
  const visited = new Set([start]);

  while (queue.length > 0) {
    const path = queue.shift();
    const current = path[path.length - 1];

    if (current === target) {
      return path;
    }

    for (const next of getPlayablePartners(current)) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push([...path, next]);
      }
    }
  }

  return null;
}

function getDistance(start, target) {
  const path = findShortestPath(start, target);
  return path ? path.length - 1 : null;
}

function cacheKey(start, target) {
  return `${start}|${target}`;
}

function precomputePaths() {
  state.pathCache.clear();
  for (const start of state.activeHeroes) {
    for (const target of state.activeHeroes) {
      if (start === target) continue;
      const path = findShortestPath(start, target);
      if (path) {
        state.pathCache.set(cacheKey(start, target), {
          path,
          distance: path.length - 1,
        });
      }
    }
  }
}

function generateRandomPuzzle() {
  const puzzles = [...state.pathCache.entries()].map(([key, result]) => {
    const separator = key.indexOf("|");
    return {
      startHero: key.slice(0, separator),
      targetHero: key.slice(separator + 1),
      optimalPath: result.path,
      optimalDistance: result.distance,
    };
  });
  const preferred = puzzles.filter(({ optimalDistance }) => optimalDistance >= 2 && optimalDistance <= 5);
  const pool = preferred.length > 0 ? preferred : puzzles.filter(({ optimalDistance }) => optimalDistance > 0);
  if (pool.length === 0) {
    throw new Error("No connected directional Team-Up paths are available.");
  }
  const nonDirect = pool.filter(({ optimalDistance }) => optimalDistance > 1);
  const source = nonDirect.length > 0 ? nonDirect : pool;
  return source[Math.floor(Math.random() * source.length)];
}

function roleLabel(hero) {
  const roles = hero.roles || [hero.role];
  return roles.filter(Boolean).join(" / ");
}

function createHeroCard(heroName, label) {
  const hero = state.heroesByName.get(heroName);
  const card = document.createElement("div");
  card.className = "hero-card-content";

  const labelElement = document.createElement("span");
  labelElement.className = "hero-card-label";
  labelElement.textContent = label;

  const name = document.createElement("strong");
  name.textContent = heroName;

  const role = document.createElement("span");
  role.className = "role-chip";
  role.textContent = roleLabel(hero);

  card.append(labelElement, name, role);
  return card;
}

function createEffectSummary(heroName, partnerName, full = false) {
  const effect = getTeamupEffect(heroName, partnerName);
  const container = document.createElement("div");
  container.className = full ? "link-effect full-link-effect" : "link-effect";

  if (!effect) {
    container.textContent = "Effect details unavailable";
    return container;
  }

  const ability = document.createElement("strong");
  ability.textContent = effect.ability_name || "Team-Up benefit";
  const benefit = document.createElement("span");
  benefit.textContent = effect.enhanced_effect || "Effect details unavailable";
  container.append(ability, benefit);

  if (full) {
    container.classList.add("effect-detail");
    container.tabIndex = 0;
    container.setAttribute("aria-label", `${effect.ability_name || "Team-Up benefit"}: ${effect.enhanced_effect || "Effect details unavailable"}`);

    const detail = document.createElement("span");
    detail.className = "effect-popover";
    detail.setAttribute("role", "tooltip");
    detail.textContent = `Enhanced: ${effect.enhanced_effect || "Effect details unavailable"}${effect.base_effect ? ` Base: ${effect.base_effect}` : ""}`;
    container.append(detail);
  }
  return container;
}

function currentHero() {
  return state.playerPath[state.playerPath.length - 1];
}

function availableChoices() {
  const used = new Set(state.playerPath);
  return getPlayablePartners(currentHero()).filter((hero) => !used.has(hero));
}

function setMessage(message, type = "info") {
  state.message = message;
  state.messageType = type;
}

function resetOptimalMoves() {
  elements.optimalPanel.hidden = true;
  elements.optimalPanel.textContent = "";
  elements.optimalToggle.textContent = "Show optimal moves";
  elements.optimalToggle.setAttribute("aria-expanded", "false");
}

function toggleOptimalMoves() {
  const shouldShow = elements.optimalPanel.hidden;
  if (shouldShow) {
    elements.optimalPanel.textContent = `Optimal route: ${state.puzzle.optimalDistance} moves`;
  }
  elements.optimalPanel.hidden = !shouldShow;
  elements.optimalToggle.textContent = shouldShow ? "Hide optimal moves" : "Show optimal moves";
  elements.optimalToggle.setAttribute("aria-expanded", String(shouldShow));
}

function selectHero(heroName) {
  if (state.gameFinished || state.playerPath.includes(heroName)) return;
  if (!isValidConnection(currentHero(), heroName)) {
    setMessage("That hero is not an available partner for the current hero.", "error");
    renderGame();
    return;
  }

  state.playerPath.push(heroName);
  if (heroName === state.puzzle.targetHero) {
    finishGame();
    return;
  }

  if (availableChoices().length === 0) {
    setMessage("There are no unused partners from this hero. Undo a move or restart the puzzle.", "warning");
  } else {
    setMessage("Choose one of the available partners shown below.", "info");
  }
  renderGame();
}

function finishGame() {
  state.gameFinished = true;
  const playerDistance = state.playerPath.length - 1;
  const difference = playerDistance - state.puzzle.optimalDistance;
  setMessage("Connected!", "success");
  renderGame();
  elements.completionPanel.hidden = false;
  elements.completionPanel.replaceChildren();

  const heading = document.createElement("h3");
  heading.textContent = "Route complete";
  const result = document.createElement("p");
  result.textContent = `${playerDistance} connection${playerDistance === 1 ? "" : "s"} · Shortest possible: ${state.puzzle.optimalDistance}`;
  const rating = document.createElement("strong");
  rating.className = "completion-rating";
  rating.textContent = difference === 0 ? "Perfect" : difference === 1 ? "Excellent · +1 from optimal" : difference === 2 ? "Good · +2 from optimal" : `Completed · +${difference} from optimal`;
  elements.completionPanel.append(heading, result, rating);
}

function undoMove() {
  if (state.gameFinished || state.playerPath.length <= 1) return;
  state.playerPath.pop();
  setMessage("Move undone.", "info");
  renderGame();
}

function restartGame() {
  if (!state.puzzle) return;
  state.playerPath = [state.puzzle.startHero];
  state.gameFinished = false;
  elements.completionPanel.hidden = true;
  resetOptimalMoves();
  setMessage("Choose a partner to make your first connection.", "info");
  renderGame();
}

function startNewGame() {
  state.puzzle = generateRandomPuzzle();
  state.playerPath = [state.puzzle.startHero];
  state.gameFinished = false;
  elements.completionPanel.hidden = true;
  resetOptimalMoves();
  setMessage("Choose a partner to make your first connection.", "info");
  renderGame();
}

function renderChoices() {
  elements.heroChoices.replaceChildren();
  if (state.gameFinished) {
    elements.choicesHeading.textContent = "Route complete";
    return;
  }

  const choices = availableChoices();
  elements.choicesHeading.textContent = choices.length > 0 ? `Partners from ${currentHero()}` : "No unused partners available";
  for (const heroName of choices.sort()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-card";
    button.setAttribute("aria-label", `Select ${heroName}`);
    const name = document.createElement("strong");
    name.textContent = heroName;
    button.append(name, createEffectSummary(currentHero(), heroName));
    button.addEventListener("click", () => selectHero(heroName));
    elements.heroChoices.append(button);
  }
}

function renderPath() {
  elements.playerPath.replaceChildren();
  state.playerPath.forEach((heroName, index) => {
    const item = document.createElement("li");
    item.className = "path-item";
    if (heroName === state.puzzle.targetHero) item.classList.add("is-target");
    const name = document.createElement("strong");
    name.textContent = heroName;
    item.append(name);
    if (index < state.playerPath.length - 1) {
      const arrow = document.createElement("span");
      arrow.className = "path-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "→";
      item.append(arrow);
      item.append(createEffectSummary(heroName, state.playerPath[index + 1], true));
    }
    elements.playerPath.append(item);
  });
}

function renderGame() {
  if (!state.puzzle) return;
  elements.startHero.replaceChildren(createHeroCard(state.puzzle.startHero, "Start hero"));
  elements.targetHero.replaceChildren(createHeroCard(state.puzzle.targetHero, "Target hero"));
  elements.moveCount.textContent = `${state.playerPath.length - 1} move${state.playerPath.length - 1 === 1 ? "" : "s"}`;
  elements.gameStatus.className = `game-status ${state.messageType}`;
  elements.gameStatus.textContent = state.message;
  elements.undoButton.disabled = state.gameFinished || state.playerPath.length <= 1;
  renderPath();
  renderChoices();
}

async function init() {
  try {
    const manifest = await loadJson(PATCH_MANIFEST_FILE);
    const params = new URLSearchParams(window.location.search);
    const availablePatches = (manifest.patches || []).filter((patch) => patch.available !== false);
    const patchIds = new Set(availablePatches.map((patch) => patch.id));
    const requestedPatch = params.get("patch") || manifest.default_patch;
    const selectedPatch = availablePatches.find((patch) => patch.id === requestedPatch)
      || availablePatches.find((patch) => patch.id === manifest.default_patch);
    if (!selectedPatch || !patchIds.has(selectedPatch.id)) {
      throw new Error("No valid patch is configured for the Link Challenge.");
    }
    state.patchId = selectedPatch.id;
    const base = `${selectedPatch.data_path.replace(/\/$/, "")}/`;
    const [heroesData, teamupsData, effectsData] = await Promise.all([
      loadJson(`../../${base}heroes.json`),
      loadJson(`../../${base}teamups.json`),
      loadJson(`../../${base}teamup_effects.json`),
    ]);
    for (const hero of heroesData.heroes || []) {
      state.heroesByName.set(hero.name, hero);
      if (hero.active !== false) state.activeHeroes.push(hero.name);
    }
    for (const [hero, partners] of Object.entries(teamupsData.teamups || {})) {
      state.teamups.set(hero, Array.isArray(partners) ? partners : []);
    }
    for (const [hero, effects] of Object.entries(effectsData.effects || {})) {
      for (const effect of effects || []) {
        if (effect.partner) state.effects.set(effectKey(hero, effect.partner), effect);
      }
    }
    precomputePaths();
    startNewGame();
  } catch (error) {
    setMessage(error.message, "error");
    elements.gameStatus.className = "game-status error";
    elements.gameStatus.textContent = state.message;
  }
}

elements.undoButton.addEventListener("click", undoMove);
elements.restartButton.addEventListener("click", restartGame);
elements.newGameButton.addEventListener("click", startNewGame);
elements.optimalToggle.addEventListener("click", toggleOptimalMoves);

init();
