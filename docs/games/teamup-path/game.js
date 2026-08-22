const PATCH_MANIFEST_FILE = "../../data/patches.json";
const COMPLETE_TEAM_STORAGE_PREFIX = "marvel-rivals:complete-team:";
const GUESS_HERO_STORAGE_PREFIX = "marvel-rivals:guess-hero:";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const state = {
  mode: "link",
  patchId: "",
  heroesByName: new Map(),
  activeHeroes: [],
  teamups: new Map(),
  effects: new Map(),
  heroDetails: new Map(),
  pathCache: new Map(),
  puzzle: null,
  playerPath: [],
  gameFinished: false,
  message: "Loading the Team-Up graph...",
  messageType: "info",
  completeTeams: [],
  dailyDate: "",
  completePuzzle: null,
  completeTeam: [],
  completeStartedAt: null,
  completeElapsedMs: 0,
  completeMistakes: 0,
  completeRemovals: 0,
  completeHints: 0,
  completeFinished: false,
  completeMessage: "Loading today's team...",
  completeMessageType: "info",
  completeHintHero: "",
  completeSearch: "",
  guessRound: "daily",
  guessDate: "",
  guessTarget: "",
  guessClues: [],
  guessClueIndex: 1,
  guessGuesses: [],
  guessFeedback: [],
  guessStartedAt: null,
  guessElapsedMs: 0,
  guessFinished: false,
  guessSearch: "",
  guessMessage: "Loading today's hero...",
  guessMessageType: "info",
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
  modeButtons: [...document.querySelectorAll("[data-game-mode]")],
  modePanels: [...document.querySelectorAll("[data-game-mode-panel]")],
  completeTeamDate: document.querySelector("#complete-team-date"),
  completeTeamTimer: document.querySelector("#complete-team-timer"),
  completeTeamScore: document.querySelector("#complete-team-score"),
  completeTeamStatus: document.querySelector("#complete-team-status"),
  completeTeamProgress: document.querySelector("#complete-team-progress"),
  completeTeamSlots: document.querySelector("#complete-team-slots"),
  completeTeamSearch: document.querySelector("#complete-team-search"),
  completeTeamCandidates: document.querySelector("#complete-team-candidates"),
  completeTeamCompletion: document.querySelector("#complete-team-completion"),
  completeTeamUndo: document.querySelector("#complete-team-undo"),
  completeTeamRestart: document.querySelector("#complete-team-restart"),
  completeTeamHint: document.querySelector("#complete-team-hint"),
  completeTeamShare: document.querySelector("#complete-team-share"),
  guessDailyButton: document.querySelector("#guess-daily-button"),
  guessRandomButton: document.querySelector("#guess-random-button"),
  guessHeroTimer: document.querySelector("#guess-hero-timer"),
  guessHeroScore: document.querySelector("#guess-hero-score"),
  guessHeroStatus: document.querySelector("#guess-hero-status"),
  guessHeroClueProgress: document.querySelector("#guess-hero-clue-progress"),
  guessHeroGuessCount: document.querySelector("#guess-hero-guess-count"),
  guessHeroClue: document.querySelector("#guess-hero-clue"),
  guessHeroSearch: document.querySelector("#guess-hero-search"),
  guessHeroCandidates: document.querySelector("#guess-hero-candidates"),
  guessHeroFeedback: document.querySelector("#guess-hero-feedback"),
  guessHeroCompletion: document.querySelector("#guess-hero-completion"),
  guessHeroReveal: document.querySelector("#guess-hero-reveal"),
  guessHeroNewRound: document.querySelector("#guess-hero-new-round"),
  guessHeroShare: document.querySelector("#guess-hero-share"),
};

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Unable to load ${path}`);
  }
  return response.json();
}

function trackEvent(eventName, params = {}) {
  if (typeof window.gtag !== "function") {
    return;
  }
  window.gtag("event", eventName, params);
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
    trackEvent("mini_game_optimal_revealed", {
      patch_id: state.patchId,
      optimal_moves: state.puzzle.optimalDistance,
    });
  }
  elements.optimalPanel.hidden = !shouldShow;
  elements.optimalToggle.textContent = shouldShow ? "Hide optimal moves" : "Show optimal moves";
  elements.optimalToggle.setAttribute("aria-expanded", String(shouldShow));
}

function selectHero(heroName) {
  if (state.gameFinished || state.playerPath.includes(heroName)) return;
  const previousHero = currentHero();
  if (!isValidConnection(currentHero(), heroName)) {
    setMessage("That hero is not an available partner for the current hero.", "error");
    renderGame();
    return;
  }

  state.playerPath.push(heroName);
  trackEvent("mini_game_move", {
    patch_id: state.patchId,
    from_hero: previousHero,
    to_hero: heroName,
    move_number: state.playerPath.length - 1,
  });
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
  trackEvent("mini_game_completed", {
    patch_id: state.patchId,
    start_hero: state.puzzle.startHero,
    target_hero: state.puzzle.targetHero,
    player_moves: playerDistance,
    optimal_moves: state.puzzle.optimalDistance,
    moves_from_optimal: difference,
  });
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
  trackEvent("mini_game_restarted", {
    patch_id: state.patchId,
    start_hero: state.puzzle.startHero,
    target_hero: state.puzzle.targetHero,
    moves_before_restart: state.playerPath.length - 1,
  });
  state.playerPath = [state.puzzle.startHero];
  state.gameFinished = false;
  elements.completionPanel.hidden = true;
  resetOptimalMoves();
  setMessage("Choose a partner to make your first connection.", "info");
  renderGame();
}

function startNewGame() {
  const previousPuzzle = state.puzzle;
  state.puzzle = generateRandomPuzzle();
  state.playerPath = [state.puzzle.startHero];
  state.gameFinished = false;
  elements.completionPanel.hidden = true;
  resetOptimalMoves();
  trackEvent("mini_game_started", {
    patch_id: state.patchId,
    start_hero: state.puzzle.startHero,
    target_hero: state.puzzle.targetHero,
    optimal_moves: state.puzzle.optimalDistance,
    is_new_game: Boolean(previousPuzzle),
  });
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

function localDateKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function generatedTeamNames(team) {
  return (team.heroes || []).map((hero) => hero.name).filter(Boolean);
}

function completeTeamStorageKey() {
  return `${COMPLETE_TEAM_STORAGE_PREFIX}${state.patchId}:${state.dailyDate}`;
}

function completeTeamIsValid(team) {
  return team.length === 6 && team.every((hero) => getPlayablePartners(hero).some((partner) => team.includes(partner)));
}

function completeTeamCanLeadTo(team) {
  return Boolean(state.completePuzzle && state.completePuzzle.validTeams.some((candidate) => team.every((hero) => candidate.includes(hero))));
}

function generateCompleteTeamPuzzle() {
  const random = seededRandom(hashString(`${state.patchId}:${state.dailyDate}:complete-team`));
  const teams = state.completeTeams
    .map(generatedTeamNames)
    .filter((team) => team.length === 6 && team.every(isPlayable));
  if (teams.length === 0) throw new Error("No fully enhanced teams are available for this patch.");

  const seedSize = random() < 0.5 ? 2 : 3;
  const source = teams[Math.floor(random() * teams.length)];
  const shuffled = [...source].sort(() => random() - 0.5);
  const seedHeroes = shuffled.slice(0, seedSize);
  const validTeams = teams.filter((team) => seedHeroes.every((hero) => team.includes(hero)));
  return { seedHeroes, seedSize, validTeams: validTeams.length ? validTeams : [source] };
}

function restoreCompleteTeamProgress() {
  state.completeTeam = [...state.completePuzzle.seedHeroes];
  state.completeStartedAt = null;
  state.completeElapsedMs = 0;
  state.completeMistakes = 0;
  state.completeRemovals = 0;
  state.completeHints = 0;
  state.completeFinished = false;
  state.completeHintHero = "";
  try {
    const saved = JSON.parse(localStorage.getItem(completeTeamStorageKey()) || "null");
    if (!saved || saved.patchId !== state.patchId || saved.dateKey !== state.dailyDate
      || JSON.stringify(saved.seedHeroes) !== JSON.stringify(state.completePuzzle.seedHeroes)) return;
    const team = Array.isArray(saved.team) ? saved.team.filter((hero) => state.activeHeroes.includes(hero)) : [];
    if (team.length >= state.completePuzzle.seedHeroes.length && state.completePuzzle.seedHeroes.every((hero) => team.includes(hero))) {
      state.completeTeam = team.slice(0, 6);
    }
    state.completeStartedAt = Number.isFinite(saved.startedAt) ? saved.startedAt : null;
    state.completeElapsedMs = Number(saved.elapsedMs) || 0;
    state.completeMistakes = Number(saved.mistakes) || 0;
    state.completeRemovals = Number(saved.removals) || 0;
    state.completeHints = Number(saved.hints) || 0;
    state.completeFinished = Boolean(saved.finished && completeTeamIsValid(state.completeTeam));
  } catch (error) {
    localStorage.removeItem(completeTeamStorageKey());
  }
  state.completeMessage = state.completeFinished ? "Daily team complete." : "Add heroes until every hero has a Team-Up partner in the team.";
  state.completeMessageType = state.completeFinished ? "success" : "info";
}

function initializeCompleteTeam() {
  const params = new URLSearchParams(window.location.search);
  const requestedDate = params.get("date");
  state.dailyDate = requestedDate && DATE_PATTERN.test(requestedDate) ? requestedDate : localDateKey();
  state.completePuzzle = generateCompleteTeamPuzzle();
  restoreCompleteTeamProgress();
  renderCompleteTeam();
}

function completeTeamElapsed() {
  if (!state.completeStartedAt || state.completeFinished) return state.completeElapsedMs;
  return state.completeElapsedMs + (Date.now() - state.completeStartedAt);
}

function formatDuration(milliseconds) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function completeTeamScore() {
  const elapsedPenalty = Math.floor(completeTeamElapsed() / 1000);
  return Math.max(0, 1000 - (state.completeMistakes * 100) - (state.completeRemovals * 35) - (state.completeHints * 150) - elapsedPenalty);
}

function saveCompleteTeamProgress() {
  try {
    localStorage.setItem(completeTeamStorageKey(), JSON.stringify({
      patchId: state.patchId,
      dateKey: state.dailyDate,
      seedHeroes: state.completePuzzle.seedHeroes,
      team: state.completeTeam,
      startedAt: state.completeStartedAt,
      elapsedMs: completeTeamElapsed(),
      mistakes: state.completeMistakes,
      removals: state.completeRemovals,
      hints: state.completeHints,
      finished: state.completeFinished,
    }));
  } catch (error) {
    // Private browsing or storage limits should not prevent play.
  }
}

function startCompleteTeamTimer() {
  if (!state.completeStartedAt && !state.completeFinished) state.completeStartedAt = Date.now();
}

function completeTeamAdd(heroName) {
  if (state.completeFinished || state.completeTeam.includes(heroName) || state.completeTeam.length >= 6) return;
  startCompleteTeamTimer();
  const nextTeam = [...state.completeTeam, heroName];
  if (!completeTeamCanLeadTo(nextTeam)) state.completeMistakes += 1;
  state.completeTeam = nextTeam;
  state.completeHintHero = "";
  if (state.completeTeam.length === 6) {
    if (completeTeamIsValid(state.completeTeam)) {
      state.completeElapsedMs = completeTeamElapsed();
      state.completeFinished = true;
      state.completeMessage = "Fully enhanced team completed.";
      state.completeMessageType = "success";
      trackEvent("mini_game_complete_team_completed", {
        patch_id: state.patchId,
        date_key: state.dailyDate,
        seed_size: state.completePuzzle.seedSize,
        mistakes: state.completeMistakes,
        removals: state.completeRemovals,
        hints: state.completeHints,
        elapsed_seconds: Math.floor(state.completeElapsedMs / 1000),
        score: completeTeamScore(),
      });
    } else {
      state.completeMessage = "This six-hero team is not fully enhanced. Remove a hero and try another.";
      state.completeMessageType = "warning";
    }
  } else {
    state.completeMessage = completeTeamCanLeadTo(nextTeam) ? "Good choice. Keep building the team." : "This choice creates a dead end. Remove it if needed.";
    state.completeMessageType = completeTeamCanLeadTo(nextTeam) ? "info" : "warning";
  }
  saveCompleteTeamProgress();
  renderCompleteTeam();
}

function completeTeamRemove(heroName) {
  if (state.completeFinished || state.completePuzzle.seedHeroes.includes(heroName)) return;
  startCompleteTeamTimer();
  state.completeTeam = state.completeTeam.filter((hero) => hero !== heroName);
  state.completeRemovals += 1;
  state.completeHintHero = "";
  state.completeMessage = "Hero removed. Choose another candidate.";
  state.completeMessageType = "info";
  saveCompleteTeamProgress();
  renderCompleteTeam();
}

function undoCompleteTeam() {
  const removable = [...state.completeTeam].reverse().find((hero) => !state.completePuzzle.seedHeroes.includes(hero));
  if (removable) completeTeamRemove(removable);
}

function giveCompleteTeamHint() {
  if (state.completeFinished) return;
  startCompleteTeamTimer();
  const counts = new Map();
  for (const team of state.completePuzzle.validTeams) {
    for (const hero of team) if (!state.completeTeam.includes(hero)) counts.set(hero, (counts.get(hero) || 0) + 1);
  }
  const [hero] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] || [];
  if (!hero) return;
  state.completeHints += 1;
  state.completeHintHero = hero;
  state.completeMessage = `Hint: try ${hero}. This hero appears in the most remaining valid teams.`;
  state.completeMessageType = "info";
  saveCompleteTeamProgress();
  renderCompleteTeam();
}

function renderCompleteTeam() {
  if (!state.completePuzzle) return;
  elements.completeTeamDate.textContent = `Daily puzzle - ${state.dailyDate}`;
  elements.completeTeamTimer.textContent = formatDuration(completeTeamElapsed());
  elements.completeTeamScore.textContent = `Score: ${state.completeFinished ? completeTeamScore() : "--"}`;
  elements.completeTeamProgress.textContent = `${state.completeTeam.length} / 6 heroes`;
  elements.completeTeamStatus.className = `game-status ${state.completeMessageType}`;
  elements.completeTeamStatus.textContent = state.completeMessage;
  elements.completeTeamSlots.replaceChildren();
  state.completeTeam.forEach((heroName, index) => {
    const slot = document.createElement("div");
    slot.className = "complete-team-slot filled";
    if (state.completePuzzle.seedHeroes.includes(heroName)) slot.classList.add("seed-hero");
    const name = document.createElement("strong");
    name.textContent = heroName;
    const role = document.createElement("span");
    role.className = "role-chip";
    role.textContent = roleLabel(state.heroesByName.get(heroName));
    slot.append(name, role);
    if (!state.completePuzzle.seedHeroes.includes(heroName) && !state.completeFinished) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "slot-remove";
      remove.textContent = "Remove";
      remove.addEventListener("click", () => completeTeamRemove(heroName));
      slot.append(remove);
    } else if (state.completePuzzle.seedHeroes.includes(heroName)) {
      const locked = document.createElement("span");
      locked.className = "slot-note";
      locked.textContent = "Seed";
      slot.append(locked);
    }
    elements.completeTeamSlots.append(slot);
  });
  for (let index = state.completeTeam.length; index < 6; index += 1) {
    const slot = document.createElement("div");
    slot.className = "complete-team-slot empty";
    slot.textContent = "Open slot";
    elements.completeTeamSlots.append(slot);
  }

  elements.completeTeamCandidates.replaceChildren();
  const query = state.completeSearch.trim().toLowerCase();
  const candidates = state.activeHeroes.filter((hero) => !state.completeTeam.includes(hero) && hero.toLowerCase().includes(query));
  for (const heroName of candidates.sort()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "complete-team-candidate";
    if (heroName === state.completeHintHero) button.classList.add("hint-candidate");
    button.disabled = state.completeFinished || state.completeTeam.length >= 6;
    const name = document.createElement("strong");
    name.textContent = heroName;
    const role = document.createElement("span");
    role.className = "candidate-role";
    role.textContent = roleLabel(state.heroesByName.get(heroName));
    const preview = document.createElement("span");
    preview.textContent = completeTeamCanLeadTo([...state.completeTeam, heroName]) ? "Keeps a valid team open" : "Dead end";
    button.append(name, role, preview);
    button.addEventListener("click", () => completeTeamAdd(heroName));
    elements.completeTeamCandidates.append(button);
  }
  elements.completeTeamUndo.disabled = state.completeFinished || !state.completeTeam.some((hero) => !state.completePuzzle.seedHeroes.includes(hero));
  elements.completeTeamRestart.disabled = false;
  elements.completeTeamHint.disabled = state.completeFinished;
  elements.completeTeamShare.disabled = !state.completeFinished;
  if (state.completeFinished) {
    elements.completeTeamCompletion.hidden = false;
    elements.completeTeamCompletion.replaceChildren();
    const heading = document.createElement("h3");
    heading.textContent = "Team complete";
    const result = document.createElement("p");
    result.textContent = `Score: ${completeTeamScore()} - ${formatDuration(state.completeElapsedMs)} - ${state.completeMistakes} mistake${state.completeMistakes === 1 ? "" : "s"}`;
    const effectsHeading = document.createElement("strong");
    effectsHeading.className = "complete-effects-heading";
    effectsHeading.textContent = "Triggered Team-Up effects";
    const effectsList = document.createElement("div");
    effectsList.className = "complete-effects-list";
    for (const heroName of state.completeTeam) {
      const partner = getPlayablePartners(heroName).find((candidate) => state.completeTeam.includes(candidate));
      const effect = getTeamupEffect(heroName, partner);
      const item = document.createElement("div");
      item.className = "complete-effect-item";
      const title = document.createElement("strong");
      title.textContent = `${heroName} -> ${partner || "Team-Up partner"}`;
      const benefit = document.createElement("span");
      benefit.textContent = effect?.enhanced_effect || "Effect details unavailable";
      item.append(title, benefit);
      effectsList.append(item);
    }
    elements.completeTeamCompletion.append(heading, result, effectsHeading, effectsList);
  } else {
    elements.completeTeamCompletion.hidden = true;
  }
}

function restartCompleteTeam() {
  if (!state.completePuzzle) return;
  state.completeTeam = [...state.completePuzzle.seedHeroes];
  state.completeStartedAt = null;
  state.completeElapsedMs = 0;
  state.completeMistakes = 0;
  state.completeRemovals = 0;
  state.completeHints = 0;
  state.completeFinished = false;
  state.completeHintHero = "";
  state.completeMessage = "Add heroes until every hero has a Team-Up partner in the team.";
  state.completeMessageType = "info";
  saveCompleteTeamProgress();
  trackEvent("mini_game_complete_team_restarted", { patch_id: state.patchId, date_key: state.dailyDate });
  renderCompleteTeam();
}

async function shareCompleteTeamResult() {
  if (!state.completeFinished) return;
  const text = `Marvel Rivals Complete the Team\nDaily puzzle (${state.completePuzzle.seedSize} seed heroes)\n${formatDuration(state.completeElapsedMs)} | Score ${completeTeamScore()} | ${state.completeMistakes} mistakes`;
  try {
    await navigator.clipboard.writeText(text);
    state.completeMessage = "Spoiler-free result copied to the clipboard.";
    state.completeMessageType = "success";
  } catch (error) {
    window.prompt("Copy your spoiler-free result:", text);
  }
  renderCompleteTeam();
}

function guessHeroStorageKey() {
  return `${GUESS_HERO_STORAGE_PREFIX}${state.patchId}:${state.guessDate}`;
}

function guessHeroElapsed() {
  if (!state.guessStartedAt || state.guessFinished) return state.guessElapsedMs;
  return state.guessElapsedMs + (Date.now() - state.guessStartedAt);
}

function guessHeroRoles(heroName) {
  const hero = state.heroesByName.get(heroName);
  const details = state.heroDetails.get(heroName);
  return [...new Set([...(hero?.roles || []), hero?.role, details?.role].filter(Boolean).map((role) => String(role).toLowerCase()))];
}

function firstTeamupAbility(heroName) {
  const details = state.heroDetails.get(heroName);
  return (details?.team_up_abilities || []).find((ability) => getPartners(heroName).includes(ability.partner))
    || (details?.team_up_abilities || [])[0]
    || null;
}

function buildGuessClues(heroName) {
  const hero = state.heroesByName.get(heroName);
  const details = state.heroDetails.get(heroName);
  const ability = (details?.abilities || []).find((item) => item.section !== "Team-Up Abilities" && item.name && item.description);
  const teamup = firstTeamupAbility(heroName);
  const enhancedStat = teamup?.enhanced_stats && Object.entries(teamup.enhanced_stats)[0];
  const roles = hero ? roleLabel(hero) : details?.role || "Unknown";
  const clues = [
    teamup?.partner ? { label: "Team-Up partner", text: `One directional Team-Up partner is ${teamup.partner}.` } : null,
    teamup?.name ? { label: "Team-Up ability", text: `${teamup.name} is one of this hero's Team-Up abilities.` } : null,
    teamup?.enhanced_effect ? {
      label: "Enhanced effect",
      text: `${teamup.enhanced_effect}${enhancedStat ? ` ${enhancedStat[0]}: ${enhancedStat[1]}.` : ""}`,
    } : null,
    roles ? { label: "Role", text: `This hero is a ${roles}.` } : null,
    hero?.roles?.length > 1 ? { label: "Eligible roles", text: `This hero can also fill: ${hero.roles.join(" / ")}.` } : null,
    ability ? { label: "Core ability", text: `${ability.name}: ${ability.description}` } : null,
  ].filter(Boolean);
  return clues.length ? clues : [{ label: "Clue", text: "This hero is active in the selected patch." }];
}

function chooseDailyGuessHero() {
  const heroes = [...state.activeHeroes].sort((a, b) => a.localeCompare(b));
  const random = seededRandom(hashString(`${state.patchId}:${state.guessDate}:guess-hero`));
  return heroes[Math.floor(random() * heroes.length)];
}

function chooseRandomGuessHero() {
  const heroes = state.activeHeroes.filter((hero) => hero !== state.guessTarget);
  return heroes[Math.floor(Math.random() * heroes.length)] || state.activeHeroes[0];
}

function saveGuessHeroProgress() {
  if (state.guessRound !== "daily") return;
  try {
    localStorage.setItem(guessHeroStorageKey(), JSON.stringify({
      patchId: state.patchId,
      dateKey: state.guessDate,
      target: state.guessTarget,
      clueIndex: state.guessClueIndex,
      guesses: state.guessGuesses,
      feedback: state.guessFeedback,
      startedAt: state.guessStartedAt,
      elapsedMs: guessHeroElapsed(),
      finished: state.guessFinished,
    }));
  } catch (error) {
    // Storage is optional for gameplay.
  }
}

function restoreGuessHeroProgress() {
  if (state.guessRound !== "daily") return;
  try {
    const saved = JSON.parse(localStorage.getItem(guessHeroStorageKey()) || "null");
    if (!saved || saved.patchId !== state.patchId || saved.dateKey !== state.guessDate || saved.target !== state.guessTarget) return;
    state.guessClueIndex = Math.min(state.guessClues.length, Math.max(1, Number(saved.clueIndex) || 1));
    state.guessGuesses = Array.isArray(saved.guesses) ? saved.guesses.filter((hero) => state.activeHeroes.includes(hero)) : [];
    state.guessFeedback = Array.isArray(saved.feedback) ? saved.feedback : [];
    state.guessStartedAt = Number.isFinite(saved.startedAt) ? saved.startedAt : null;
    state.guessElapsedMs = Number(saved.elapsedMs) || 0;
    state.guessFinished = Boolean(saved.finished && state.guessGuesses.includes(state.guessTarget));
  } catch (error) {
    localStorage.removeItem(guessHeroStorageKey());
  }
}

function initializeGuessHero(round = state.guessRound) {
  const params = new URLSearchParams(window.location.search);
  state.guessRound = round === "random" ? "random" : "daily";
  state.guessDate = params.get("date") && DATE_PATTERN.test(params.get("date")) ? params.get("date") : localDateKey();
  state.guessTarget = state.guessRound === "daily" ? chooseDailyGuessHero() : chooseRandomGuessHero();
  state.guessClues = buildGuessClues(state.guessTarget);
  state.guessClueIndex = 1;
  state.guessGuesses = [];
  state.guessFeedback = [];
  state.guessStartedAt = null;
  state.guessElapsedMs = 0;
  state.guessFinished = false;
  state.guessSearch = "";
  elements.guessHeroSearch.value = "";
  state.guessMessage = state.guessRound === "daily" ? "Use the first clue to identify today's hero." : "Use the clues to identify the hero.";
  state.guessMessageType = "info";
  const url = new URL(window.location.href);
  if (state.guessRound === "random") url.searchParams.set("round", "random");
  else url.searchParams.delete("round");
  history.replaceState(null, "", url);
  if (state.guessRound === "daily") restoreGuessHeroProgress();
  renderGuessHero();
  trackEvent("guess_hero_started", { patch_id: state.patchId, round_type: state.guessRound });
}

function guessHeroScore() {
  const elapsedPenalty = Math.floor(guessHeroElapsed() / 1000);
  const guessPenalty = Math.max(0, state.guessGuesses.length - 1) * 100;
  const cluePenalty = Math.max(0, state.guessClueIndex - 1) * 75;
  return Math.max(0, 1000 - guessPenalty - cluePenalty - elapsedPenalty);
}

function startGuessHeroTimer() {
  if (!state.guessStartedAt && !state.guessFinished) state.guessStartedAt = Date.now();
}

function compareGuess(heroName) {
  const targetRoles = new Set(guessHeroRoles(state.guessTarget));
  const guessRoles = new Set(guessHeroRoles(heroName));
  const roleMatch = [...guessRoles].some((role) => targetRoles.has(role));
  const targetPartners = new Set(getPartners(state.guessTarget));
  const partnerOverlap = getPartners(heroName).filter((partner) => targetPartners.has(partner)).length;
  return { heroName, roleMatch, partnerOverlap };
}

function submitGuessHero(heroName) {
  if (state.guessFinished || !state.activeHeroes.includes(heroName) || state.guessGuesses.includes(heroName)) return;
  startGuessHeroTimer();
  state.guessGuesses.push(heroName);
  if (heroName === state.guessTarget) {
    state.guessElapsedMs = guessHeroElapsed();
    state.guessFinished = true;
    state.guessMessage = "Correct! You identified the hero.";
    state.guessMessageType = "success";
    trackEvent("guess_hero_completed", {
      patch_id: state.patchId,
      round_type: state.guessRound,
      guess_number: state.guessGuesses.length,
      clues_revealed: state.guessClueIndex,
      elapsed_seconds: Math.floor(state.guessElapsedMs / 1000),
      score: guessHeroScore(),
    });
  } else {
    const feedback = compareGuess(heroName);
    state.guessFeedback.push(feedback);
    state.guessClueIndex = Math.min(state.guessClues.length, state.guessClueIndex + 1);
    state.guessMessage = "Not quite. The next clue is now available.";
    state.guessMessageType = "warning";
    trackEvent("guess_hero_guess_submitted", {
      patch_id: state.patchId,
      round_type: state.guessRound,
      guess_number: state.guessGuesses.length,
      role_match: feedback.roleMatch,
      partner_overlap: feedback.partnerOverlap,
    });
  }
  saveGuessHeroProgress();
  renderGuessHero();
}

function revealGuessHeroClue() {
  if (state.guessFinished || state.guessClueIndex >= state.guessClues.length) return;
  startGuessHeroTimer();
  state.guessClueIndex += 1;
  state.guessMessage = "The next clue is revealed.";
  state.guessMessageType = "info";
  trackEvent("guess_hero_clue_revealed", {
    patch_id: state.patchId,
    round_type: state.guessRound,
    clues_revealed: state.guessClueIndex,
  });
  saveGuessHeroProgress();
  renderGuessHero();
}

function renderGuessFeedback() {
  elements.guessHeroFeedback.replaceChildren();
  if (!state.guessFeedback.length) {
    const empty = document.createElement("p");
    empty.className = "guess-feedback-empty";
    empty.textContent = "Your incorrect guesses and clue matches will appear here.";
    elements.guessHeroFeedback.append(empty);
    return;
  }
  state.guessFeedback.forEach((feedback, index) => {
    const row = document.createElement("div");
    row.className = "guess-feedback-row";
    const name = document.createElement("strong");
    name.textContent = `${index + 1}. ${feedback.heroName}`;
    const role = document.createElement("span");
    role.className = feedback.roleMatch ? "feedback-match" : "feedback-different";
    role.textContent = feedback.roleMatch ? "Role match" : "Different role";
    const partners = document.createElement("span");
    if (feedback.partnerOverlap) {
      partners.className = "feedback-match";
      partners.textContent = `${feedback.partnerOverlap} shared Team-Up partner${feedback.partnerOverlap === 1 ? "" : "s"}`;
    }
    if (feedback.roleMatch || feedback.partnerOverlap) {
      row.append(name);
      if (feedback.roleMatch) row.append(role);
      if (feedback.partnerOverlap) row.append(partners);
    } else {
      const noMatch = document.createElement("span");
      noMatch.className = "feedback-different";
      noMatch.textContent = "No shared role or Team-Up partner";
      row.append(name, noMatch);
    }
    elements.guessHeroFeedback.append(row);
  });
}

function renderGuessHero() {
  if (!state.guessTarget || !state.guessClues.length) return;
  elements.guessDailyButton.classList.toggle("active", state.guessRound === "daily");
  elements.guessRandomButton.classList.toggle("active", state.guessRound === "random");
  elements.guessDailyButton.setAttribute("aria-selected", String(state.guessRound === "daily"));
  elements.guessRandomButton.setAttribute("aria-selected", String(state.guessRound === "random"));
  elements.guessHeroTimer.textContent = formatDuration(guessHeroElapsed());
  elements.guessHeroScore.textContent = `Score: ${state.guessFinished ? guessHeroScore() : "--"}`;
  elements.guessHeroStatus.className = `game-status ${state.guessMessageType}`;
  elements.guessHeroStatus.textContent = state.guessMessage;
  elements.guessHeroClueProgress.textContent = `Clue ${state.guessClueIndex} of ${state.guessClues.length}`;
  elements.guessHeroGuessCount.textContent = `${state.guessGuesses.length} guess${state.guessGuesses.length === 1 ? "" : "es"}`;
  const clue = state.guessClues[state.guessClueIndex - 1];
  elements.guessHeroClue.replaceChildren();
  const label = document.createElement("span");
  label.className = "guess-clue-label";
  label.textContent = clue.label;
  const text = document.createElement("strong");
  text.textContent = clue.text;
  elements.guessHeroClue.append(label, text);

  elements.guessHeroCandidates.replaceChildren();
  const query = state.guessSearch.trim().toLowerCase();
  const candidates = query ? state.activeHeroes.filter((hero) => hero.toLowerCase().includes(query)) : [];
  candidates.sort().forEach((heroName) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "guess-hero-candidate";
    button.disabled = state.guessFinished || state.guessGuesses.includes(heroName);
    button.textContent = heroName;
    button.addEventListener("click", () => submitGuessHero(heroName));
    elements.guessHeroCandidates.append(button);
  });
  renderGuessFeedback();
  elements.guessHeroReveal.disabled = state.guessFinished || state.guessClueIndex >= state.guessClues.length;
  elements.guessHeroShare.disabled = !state.guessFinished;
  elements.guessHeroCompletion.hidden = !state.guessFinished;
  if (state.guessFinished) {
    elements.guessHeroCompletion.replaceChildren();
    const heading = document.createElement("h3");
    heading.textContent = "Correct!";
    const result = document.createElement("p");
    result.textContent = `${state.guessTarget} - ${state.guessGuesses.length} guess${state.guessGuesses.length === 1 ? "" : "es"}, ${state.guessClueIndex} clue${state.guessClueIndex === 1 ? "" : "s"} used.`;
    const roles = document.createElement("p");
    roles.textContent = `Role: ${roleLabel(state.heroesByName.get(state.guessTarget))}`;
    const effects = document.createElement("p");
    const teamup = firstTeamupAbility(state.guessTarget);
    effects.textContent = teamup?.enhanced_effect ? `Team-Up benefit: ${teamup.enhanced_effect}` : "Team-Up benefit details unavailable.";
    elements.guessHeroCompletion.append(heading, result, roles, effects);
  }
}

async function shareGuessHeroResult() {
  if (!state.guessFinished) return;
  const text = `Marvel Rivals Guess the Hero\n${state.guessRound === "daily" ? "Daily puzzle" : "Random round"}\n${state.guessGuesses.length} guesses | ${state.guessClueIndex} clues | Score ${guessHeroScore()}`;
  try {
    await navigator.clipboard.writeText(text);
    state.guessMessage = "Spoiler-free result copied to the clipboard.";
    state.guessMessageType = "success";
  } catch (error) {
    window.prompt("Copy your spoiler-free result:", text);
  }
  trackEvent("guess_hero_shared", { patch_id: state.patchId, round_type: state.guessRound, score: guessHeroScore() });
  renderGuessHero();
}

function setMode(mode) {
  state.mode = ["complete-team", "guess-hero"].includes(mode) ? mode : "link";
  for (const button of elements.modeButtons) {
    const isActive = button.dataset.gameMode === state.mode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  }
  for (const panel of elements.modePanels) {
    const isActive = panel.dataset.gameModePanel === state.mode;
    panel.classList.toggle("active", isActive);
    panel.hidden = !isActive;
  }
  const url = new URL(window.location.href);
  if (state.mode === "complete-team" || state.mode === "guess-hero") url.searchParams.set("mode", state.mode);
  else url.searchParams.delete("mode");
  history.replaceState(null, "", url);
  if (state.mode === "complete-team") renderCompleteTeam();
  if (state.mode === "guess-hero") renderGuessHero();
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
    const [heroesData, teamupsData, effectsData, completeTeamsData, heroDetailsData] = await Promise.all([
      loadJson(`../../${base}heroes.json`),
      loadJson(`../../${base}teamups.json`),
      loadJson(`../../${base}teamup_effects.json`),
      loadJson(`../../${base}all_fully_enhanced_teams.json`),
      loadJson(`../../${base}hero_details.json`),
    ]);
    state.completeTeams = completeTeamsData.teams || [];
    state.heroDetails = new Map(Object.entries(heroDetailsData.heroes || {}));
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
    initializeCompleteTeam();
    initializeGuessHero(params.get("round") === "random" ? "random" : "daily");
    setMode(params.get("mode"));
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
elements.modeButtons.forEach((button) => {
  if (button.dataset.gameModePanel) return;
  button.addEventListener("click", () => {
    const mode = button.dataset.gameMode;
    trackEvent("mini_game_mode_changed", { patch_id: state.patchId, mode });
    setMode(mode);
  });
});
elements.completeTeamUndo.addEventListener("click", undoCompleteTeam);
elements.completeTeamRestart.addEventListener("click", restartCompleteTeam);
elements.completeTeamHint.addEventListener("click", giveCompleteTeamHint);
elements.completeTeamShare.addEventListener("click", shareCompleteTeamResult);
elements.completeTeamSearch.addEventListener("input", (event) => {
  state.completeSearch = event.target.value;
  renderCompleteTeam();
});
elements.guessDailyButton.addEventListener("click", () => {
  initializeGuessHero("daily");
  setMode("guess-hero");
});
elements.guessRandomButton.addEventListener("click", () => {
  initializeGuessHero("random");
  setMode("guess-hero");
});
elements.guessHeroSearch.addEventListener("input", (event) => {
  state.guessSearch = event.target.value;
  renderGuessHero();
});
elements.guessHeroReveal.addEventListener("click", revealGuessHeroClue);
elements.guessHeroNewRound.addEventListener("click", () => initializeGuessHero("random"));
elements.guessHeroShare.addEventListener("click", shareGuessHeroResult);

setInterval(() => {
  if (state.mode === "complete-team" && state.completeStartedAt && !state.completeFinished) renderCompleteTeam();
  if (state.mode === "guess-hero" && state.guessStartedAt && !state.guessFinished) renderGuessHero();
}, 1000);

init();
