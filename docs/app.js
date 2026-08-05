const PATCH_MANIFEST_FILE = "data/patches.json";
const PATCH_STORAGE_KEY = "marvel-rivals:selected-patch:v1";
const SHARED_DATA_FILES = {
  maps: "data/maps.json",
  updates: "data/updates.json",
};

function patchDataFiles(patch) {
  const base = `${patch.data_path.replace(/\/$/, "")}/`;
  return {
    summary: `${base}summary.json`,
    heroes: `${base}heroes.json`,
    teamups: `${base}teamups.json`,
    teamupEffects: `${base}teamup_effects.json`,
    heroDetails: `${base}hero_details.json`,
    all: `${base}all_fully_enhanced_teams.json`,
    222: `${base}fully_enhanced_222_teams.json`,
    132: `${base}fully_enhanced_132_teams.json`,
    213: `${base}fully_enhanced_213_teams.json`,
    123: `${base}fully_enhanced_123_teams.json`,
    312: `${base}fully_enhanced_312_teams.json`,
    ...SHARED_DATA_FILES,
  };
}

const FEEDBACK_ENDPOINT = "https://marvel-rivals-feedback.insaneweihang.workers.dev/feedback";
const SAVED_COMPS_KEY = "marvel-rivals:saved-comps:v1";
const PLAYER_POOLS_KEY = "marvel-rivals:player-pools:v1";
const MAX_SAVED_COMPS = 20;
const SAMPLE_DUO_POOLS = {
  player1: ["Venom", "The Thing"],
  player2: ["Luna Snow", "Ultron"],
};
const ROLE_ORDER = ["Vanguard", "Duelist", "Strategist"];
const TEAM_MODES = {
  all: {
    label: "All",
    shortLabel: "All",
    helperLabel: "Any Role Mix",
    description: "Any role mix",
    filePrefix: "all_fully_enhanced",
  },
  222: {
    label: "2-2-2",
    shortLabel: "2-2-2",
    helperLabel: "Standard",
    description: "Recommended: 2 Vanguard / 2 Duelist / 2 Strategist",
    filePrefix: "fully_enhanced_222",
  },
  132: {
    label: "1-3-2",
    shortLabel: "1-3-2",
    helperLabel: "Solo Tank, Triple DPS",
    description: "1 Vanguard / 3 Duelist / 2 Strategist",
    filePrefix: "fully_enhanced_132",
  },
  213: {
    label: "2-1-3",
    shortLabel: "2-1-3",
    helperLabel: "Double Tank, Triple Support",
    description: "2 Vanguard / 1 Duelist / 3 Strategist",
    filePrefix: "fully_enhanced_213",
  },
  123: {
    label: "1-2-3",
    shortLabel: "1-2-3",
    helperLabel: "Solo Tank, Triple Support",
    description: "1 Vanguard / 2 Duelist / 3 Strategist",
    filePrefix: "fully_enhanced_123",
  },
  312: {
    label: "3-1-2",
    shortLabel: "3-1-2",
    helperLabel: "Triple Tank",
    description: "3 Vanguard / 1 Duelist / 2 Strategist",
    filePrefix: "fully_enhanced_312",
  },
};
const TEAM_MODE_KEYS = ["all", "222", "132", "213", "123", "312"];
const state = {
  patchId: "",
  patchManifest: null,
  activeView: "browser",
  mode: "all",
  includedHeroes: new Set(),
  excludedHeroes: new Set(),
  builderHeroes: new Set(),
  builderMode: "all",
  builderPanel: "draft",
  builderNotice: "",
  detailHero: null,
  search: "",
  builderSearch: "",
  poolMode: "all",
  poolSearches: {
    player1: "",
    player2: "",
  },
  playerPools: {
    player1: new Set(),
    player2: new Set(),
  },
  selectedPoolPair: null,
  poolStatus: "",
  mapSearch: "",
  selectedMapType: "All",
  selectedMapCategory: "All",
  savedComps: [],
  savedCompsStatus: "",
  shareCardPayload: null,
  shareCardStatus: "",
  showTeamupEffects: false,
  teamEffectOverrides: new Map(),
  updates: [],
  updatesVersion: "",
  updatesUpdatedAt: "",
  updatesOpen: false,
  summary: null,
  mapsData: null,
  heroesByName: new Map(),
  teamups: new Map(),
  teamupEffects: new Map(),
  heroDetails: new Map(),
  teams: {
    all: [],
    222: [],
    132: [],
    213: [],
    123: [],
    312: [],
  },
  heroesByRole: new Map(),
};

const elements = {
  patchVersion: document.querySelector("#patch-version"),
  patchSelect: document.querySelector("#patch-select"),
  linkChallenge: document.querySelector("#link-challenge-link"),
  allCount: document.querySelector("#all-count"),
  balancedCount: document.querySelector("#balanced-count"),
  checkedCount: document.querySelector("#checked-count"),
  modeDescription: document.querySelector("#mode-description"),
  toggleTeamupEffects: document.querySelector("#toggle-teamup-effects"),
  viewButtons: document.querySelectorAll("[data-view]"),
  appViews: document.querySelectorAll(".app-view"),
  modeButtons: document.querySelectorAll("[data-mode]"),
  builderModeButtons: document.querySelectorAll("[data-builder-mode]"),
  builderPanelButtons: document.querySelectorAll("[data-builder-panel]"),
  poolModeButtons: document.querySelectorAll("[data-pool-mode]"),
  builderDraftWorkspace: document.querySelector("#builder-draft-workspace"),
  builderPoolsWorkspace: document.querySelector("#builder-pools-workspace"),
  clearBuilder: document.querySelector("#clear-builder"),
  builderHeroSearch: document.querySelector("#builder-hero-search"),
  builderHeroPicker: document.querySelector("#builder-hero-picker"),
  builderSelected: document.querySelector("#builder-selected"),
  builderStatus: document.querySelector("#builder-status"),
  resetBuilderTeam: document.querySelector("#reset-builder-team"),
  builderCurrentStatus: document.querySelector("#builder-current-status"),
  builderSuggestions: document.querySelector("#builder-suggestions"),
  builderMatches: document.querySelector("#builder-matches"),
  saveBuilderComp: document.querySelector("#save-builder-comp"),
  savedCompsCount: document.querySelector("#saved-comps-count"),
  savedCompsStatus: document.querySelector("#saved-comps-status"),
  savedCompsList: document.querySelector("#saved-comps-list"),
  poolStatus: document.querySelector("#pool-status"),
  poolOneCount: document.querySelector("#pool-one-count"),
  poolTwoCount: document.querySelector("#pool-two-count"),
  poolOneSelected: document.querySelector("#pool-one-selected"),
  poolTwoSelected: document.querySelector("#pool-two-selected"),
  poolOneSearch: document.querySelector("#pool-one-search"),
  poolTwoSearch: document.querySelector("#pool-two-search"),
  poolOnePicker: document.querySelector("#pool-one-picker"),
  poolTwoPicker: document.querySelector("#pool-two-picker"),
  poolRecommendations: document.querySelector("#pool-recommendations"),
  poolMatrix: document.querySelector("#pool-matrix"),
  poolComps: document.querySelector("#pool-comps"),
  draftWorkflowSummary: document.querySelector("#draft-workflow-summary"),
  poolWorkflowSummary: document.querySelector("#pool-workflow-summary"),
  showPlayerPools: document.querySelector("#show-player-pools"),
  trySamplePools: document.querySelector("#try-sample-pools"),
  copyPoolsLink: document.querySelector("#copy-pools-link"),
  resetPlayerPools: document.querySelector("#reset-player-pools"),
  heroSearch: document.querySelector("#hero-search"),
  clearFilters: document.querySelector("#clear-filters"),
  selectedHeroes: document.querySelector("#selected-heroes"),
  heroGroups: document.querySelector("#hero-groups"),
  resultsTitle: document.querySelector("#results-title"),
  statusMessage: document.querySelector("#status-message"),
  teamList: document.querySelector("#team-list"),
  markdownLink: document.querySelector("#markdown-link"),
  jsonLink: document.querySelector("#json-link"),
  heroDetail: document.querySelector("#hero-detail"),
  mapSearch: document.querySelector("#map-search"),
  mapSummary: document.querySelector("#map-summary"),
  mapTypeFilters: document.querySelector("#map-type-filters"),
  mapCategoryFilters: document.querySelector("#map-category-filters"),
  mapDefinitions: document.querySelector("#map-definitions"),
  mapsSource: document.querySelector("#maps-source"),
  mapsTitle: document.querySelector("#maps-title"),
  mapsList: document.querySelector("#maps-list"),
  updatesToggle: document.querySelector("#updates-toggle"),
  updatesPanel: document.querySelector("#updates-panel"),
  updatesClose: document.querySelector("#updates-close"),
  updatesVersion: document.querySelector("#updates-version"),
  updatesList: document.querySelector("#updates-list"),
  feedbackForm: document.querySelector("#feedback-form"),
  feedbackSubmit: document.querySelector("#feedback-submit"),
  feedbackStatus: document.querySelector("#feedback-status"),
  shareCardModal: document.querySelector("#share-card-modal"),
  shareCardTitle: document.querySelector("#share-card-title"),
  shareCardClose: document.querySelector("#share-card-close"),
  shareCardCanvas: document.querySelector("#share-card-canvas"),
  shareCardStatus: document.querySelector("#share-card-status"),
  downloadShareCard: document.querySelector("#download-share-card"),
  copyShareCardImage: document.querySelector("#copy-share-card-image"),
  copyShareCardText: document.querySelector("#copy-share-card-text"),
};

function formatNumber(value) {
  return Number(value).toLocaleString("en-US");
}

function trackEvent(eventName, params = {}) {
  if (typeof window.gtag !== "function") {
    return;
  }
  window.gtag("event", eventName, params);
}

function normalizeTeamMode(mode) {
  return TEAM_MODES[mode] ? mode : "all";
}

function modeLabel(mode) {
  return TEAM_MODES[normalizeTeamMode(mode)].shortLabel;
}

function sourceTeams(mode) {
  return state.teams[normalizeTeamMode(mode)] || state.teams.all;
}

function modeFilePrefix(mode) {
  return TEAM_MODES[normalizeTeamMode(mode)].filePrefix;
}

function modeDetails(mode) {
  const config = TEAM_MODES[normalizeTeamMode(mode)];
  return config.shortLabel === "All"
    ? config.helperLabel
    : `${config.shortLabel} ${config.helperLabel}`;
}

function renderModeButton(button, mode) {
  const config = TEAM_MODES[normalizeTeamMode(mode)];
  button.title = `${config.helperLabel} - ${config.description}`;
  button.replaceChildren();

  const label = document.createElement("strong");
  label.textContent = config.shortLabel;

  const helper = document.createElement("small");
  helper.textContent = config.helperLabel;

  button.append(label, helper);
}

async function loadJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Could not load ${path}: ${response.status}`);
  }
  return response.json();
}

function roleColor(role) {
  if (role === "Vanguard") {
    return "#2f6f9f";
  }
  if (role === "Duelist") {
    return "#9f3f45";
  }
  if (role === "Strategist") {
    return "#297a5f";
  }
  return "#1f2a24";
}

function teamNames(team) {
  return team.heroes.map((hero) => hero.name);
}

function teamIncludesHero(team, heroName) {
  return team.heroes.some((hero) => hero.name === heroName);
}

function eligibleRoles(hero) {
  if (hero?.roles?.length) {
    return hero.roles;
  }
  if (hero?.eligible_roles?.length) {
    return hero.eligible_roles;
  }
  return hero?.role ? [hero.role] : [];
}

function rolesText(hero) {
  return eligibleRoles(hero).join(" / ");
}

function effectKey(heroName, partnerName) {
  return `${heroName}\u0000${partnerName}`;
}

function teamupEffect(heroName, partnerName) {
  return state.teamupEffects.get(effectKey(heroName, partnerName));
}

function officialTeamupAbility(heroName, partnerName) {
  const details = state.heroDetails.get(heroName);
  if (!details || !Array.isArray(details.team_up_abilities)) {
    return null;
  }
  return details.team_up_abilities.find((ability) => ability.partner === partnerName) || null;
}

function hasOfficialStats(stats) {
  return Object.values(stats || {}).some(Boolean);
}

function effectAbilityName(effect) {
  return effect?.ability_name && effect.ability_name !== "Unverified name" ? effect.ability_name : "";
}

function effectSummary(effect) {
  if (!effect || effect.verification_status === "needs_verification") {
    return "Effect details need verification.";
  }
  return effect.enhanced_effect || effect.base_effect || "Effect details need verification.";
}

function activeTeamupEffects(team) {
  return team.heroes
    .flatMap((hero) =>
      hero.active_partners.map((partner) => {
        const effect = teamupEffect(hero.name, partner);
        return {
          heroName: hero.name,
          partnerName: partner,
          abilityName: effectAbilityName(effect),
          summary: effectSummary(effect),
          verificationStatus: effect?.verification_status || "needs_verification",
          officialAbility: officialTeamupAbility(hero.name, partner),
        };
      }),
    )
    .sort(
      (a, b) =>
        a.heroName.localeCompare(b.heroName) ||
        a.partnerName.localeCompare(b.partnerName),
    );
}

function createSavedCompId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `comp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function safeReadSavedComps() {
  try {
    const raw = window.localStorage.getItem(SAVED_COMPS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((comp) => comp && Array.isArray(comp.heroes))
      .map((comp) => ({
        id: String(comp.id || createSavedCompId()),
        name: String(comp.name || "Saved comp"),
        heroes: comp.heroes.map(String).slice(0, 6),
        mode: normalizeTeamMode(comp.mode),
        createdAt: String(comp.createdAt || new Date().toISOString()),
        updatedAt: String(comp.updatedAt || comp.createdAt || new Date().toISOString()),
      }))
      .slice(0, MAX_SAVED_COMPS);
  } catch (error) {
    state.savedCompsStatus = "Saved comps are unavailable in this browser.";
    return [];
  }
}

function safeWriteSavedComps() {
  try {
    window.localStorage.setItem(SAVED_COMPS_KEY, JSON.stringify(state.savedComps.slice(0, MAX_SAVED_COMPS)));
    return true;
  } catch (error) {
    state.savedCompsStatus = "Could not save comp. Browser storage may be full or disabled.";
    return false;
  }
}

function safeReadPlayerPools() {
  try {
    const raw = window.localStorage.getItem(PLAYER_POOLS_KEY);
    if (!raw) {
      return { player1: [], player2: [], mode: "all" };
    }
    const parsed = JSON.parse(raw);
    return {
      player1: Array.isArray(parsed.player1) ? parsed.player1.map(String) : [],
      player2: Array.isArray(parsed.player2) ? parsed.player2.map(String) : [],
      mode: normalizeTeamMode(parsed.mode),
    };
  } catch (error) {
    state.poolStatus = "Duo Planner is unavailable in this browser.";
    return { player1: [], player2: [], mode: "all" };
  }
}

function safeWritePlayerPools() {
  try {
    window.localStorage.setItem(
      PLAYER_POOLS_KEY,
      JSON.stringify({
        player1: [...state.playerPools.player1].sort(),
        player2: [...state.playerPools.player2].sort(),
        mode: state.poolMode,
      }),
    );
    return true;
  } catch (error) {
    state.poolStatus = "Could not save Duo Planner pools. Browser storage may be full or disabled.";
    return false;
  }
}

function savedCompKey(heroes, mode) {
  return `${mode}:${[...heroes].sort().join("|")}`;
}

function currentBuilderCompName() {
  return [...state.builderHeroes].sort().join(" / ") || "Untitled comp";
}

function normalizeSavedComps() {
  const seen = new Set();
  state.savedComps = state.savedComps
    .map((comp) => ({
      ...comp,
      heroes: comp.heroes.filter((heroName) => canUseInBuilder(heroName)).slice(0, 6),
      mode: normalizeTeamMode(comp.mode),
    }))
    .filter((comp) => {
      if (!comp.heroes.length) {
        return false;
      }
      const key = savedCompKey(comp.heroes, comp.mode);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, MAX_SAVED_COMPS);
}

function deriveHeroes() {
  const roles = new Map(ROLE_ORDER.map((role) => [role, new Set()]));
  for (const hero of state.heroesByName.values()) {
    if (hero.active === false) {
      continue;
    }
    for (const role of eligibleRoles(hero)) {
      roles.get(role).add(hero.name);
    }
  }
  state.heroesByRole = new Map(
    ROLE_ORDER.map((role) => [role, [...roles.get(role)].sort((a, b) => a.localeCompare(b))]),
  );
}

function readUrlState() {
  const params = new URLSearchParams(window.location.search);
  const patch = params.get("patch");
  const view = params.get("view");
  const mode = params.get("mode");
  const include = params.get("include");
  const exclude = params.get("exclude");
  const detail = params.get("detail");
  const builder = params.get("builder");
  const builderMode = params.get("builderMode");
  const builderPanel = params.get("builderPanel");
  const poolOne = params.get("pool1");
  const poolTwo = params.get("pool2");
  const poolMode = params.get("poolMode");
  const poolPair = params.get("poolPair");

  if (patch) {
    state.patchId = patch;
  }

  if (view === "builder" || view === "browser" || view === "maps") {
    state.activeView = view;
  }
  if (mode) {
    state.mode = normalizeTeamMode(mode);
  }
  if (include) {
    state.includedHeroes = new Set(include.split(",").map(decodeURIComponent).filter(Boolean));
  }
  if (exclude) {
    state.excludedHeroes = new Set(exclude.split(",").map(decodeURIComponent).filter(Boolean));
  }
  for (const hero of state.includedHeroes) {
    state.excludedHeroes.delete(hero);
  }
  if (detail) {
    state.detailHero = decodeURIComponent(detail);
  }
  if (builder) {
    state.builderHeroes = new Set(builder.split(",").map(decodeURIComponent).filter(Boolean));
    if (view !== "browser") {
      state.activeView = "builder";
    }
  }
  if (builderMode) {
    state.builderMode = normalizeTeamMode(builderMode);
  }
  if (builderPanel === "pools") {
    state.builderPanel = "pools";
    state.activeView = "builder";
  }
  if (poolOne) {
    state.playerPools.player1 = new Set(poolOne.split(",").map(decodeURIComponent).filter(Boolean));
    state.activeView = "builder";
    state.builderPanel = "pools";
  }
  if (poolTwo) {
    state.playerPools.player2 = new Set(poolTwo.split(",").map(decodeURIComponent).filter(Boolean));
    state.activeView = "builder";
    state.builderPanel = "pools";
  }
  if (poolMode) {
    state.poolMode = normalizeTeamMode(poolMode);
  }
  if (poolPair) {
    const [firstHero, secondHero] = poolPair.split("|").map(decodeURIComponent);
    if (firstHero && secondHero) {
      state.selectedPoolPair = { firstHero, secondHero };
      state.activeView = "builder";
      state.builderPanel = "pools";
    }
  }
}

function writeUrlState() {
  const params = new URLSearchParams();
  if (state.patchId && state.patchId !== state.patchManifest?.default_patch) {
    params.set("patch", state.patchId);
  }
  if (state.activeView !== "browser" || state.builderHeroes.size) {
    params.set("view", state.activeView);
  }
  if (state.mode !== "all") {
    params.set("mode", state.mode);
  }
  if (state.includedHeroes.size) {
    params.set("include", [...state.includedHeroes].sort().join(","));
  }
  if (state.excludedHeroes.size) {
    params.set("exclude", [...state.excludedHeroes].sort().join(","));
  }
  if (state.detailHero) {
    params.set("detail", state.detailHero);
  }
  if (state.builderHeroes.size) {
    params.set("builder", [...state.builderHeroes].sort().join(","));
  }
  if (state.builderMode !== "all") {
    params.set("builderMode", state.builderMode);
  }
  const shouldWritePools = state.activeView === "builder" && state.builderPanel === "pools";
  if (shouldWritePools) {
    params.set("builderPanel", "pools");
  }
  if (shouldWritePools && state.playerPools.player1.size) {
    params.set("pool1", [...state.playerPools.player1].sort().join(","));
  }
  if (shouldWritePools && state.playerPools.player2.size) {
    params.set("pool2", [...state.playerPools.player2].sort().join(","));
  }
  if (shouldWritePools && state.poolMode !== "all") {
    params.set("poolMode", state.poolMode);
  }
  if (shouldWritePools && state.selectedPoolPair) {
    params.set("poolPair", `${state.selectedPoolPair.firstHero}|${state.selectedPoolPair.secondHero}`);
  }
  const query = params.toString();
  const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
  window.history.replaceState(null, "", nextUrl);
}

function setActiveButtons() {
  for (const button of elements.viewButtons) {
    button.classList.toggle("active", button.dataset.view === state.activeView);
  }
  for (const view of elements.appViews) {
    view.classList.toggle("active", view.id === `${state.activeView}-view`);
  }
  for (const button of elements.modeButtons) {
    renderModeButton(button, button.dataset.mode);
    button.classList.toggle("active", button.dataset.mode === state.mode);
  }
  for (const button of elements.builderModeButtons) {
    renderModeButton(button, button.dataset.builderMode);
    button.classList.toggle("active", button.dataset.builderMode === state.builderMode);
  }
  for (const button of elements.builderPanelButtons) {
    button.classList.toggle("active", button.dataset.builderPanel === state.builderPanel);
  }
  for (const button of elements.poolModeButtons) {
    renderModeButton(button, button.dataset.poolMode);
    button.classList.toggle("active", button.dataset.poolMode === state.poolMode);
  }
  const modeConfig = TEAM_MODES[normalizeTeamMode(state.mode)];
  elements.modeDescription.textContent = `${modeConfig.helperLabel}: ${modeConfig.description}`;
  elements.toggleTeamupEffects.checked = state.showTeamupEffects;
  elements.builderDraftWorkspace.classList.toggle("active", state.builderPanel === "draft");
  elements.builderPoolsWorkspace.classList.toggle("active", state.builderPanel === "pools");
}

function renderPatchSelector() {
  if (!elements.patchSelect || !state.patchManifest) {
    return;
  }
  elements.patchSelect.replaceChildren();
  for (const patch of state.patchManifest.patches || []) {
    const option = document.createElement("option");
    option.value = patch.id;
    option.textContent = patch.label || patch.id;
    option.disabled = patch.available === false;
    elements.patchSelect.append(option);
  }
  elements.patchSelect.value = state.patchId;
  if (elements.linkChallenge) {
    const patchQuery = state.patchId === state.patchManifest.default_patch
      ? ""
      : `?patch=${encodeURIComponent(state.patchId)}`;
    elements.linkChallenge.href = `games/teamup-path/${patchQuery}`;
  }
}

function renderSummary() {
  renderPatchSelector();
  elements.patchVersion.textContent = state.summary.patch_version;
  elements.allCount.textContent = formatNumber(state.summary.fully_enhanced_unrestricted_count);
  elements.balancedCount.textContent = formatNumber(state.summary.fully_enhanced_222_count);
  elements.checkedCount.textContent = formatNumber(state.summary.total_combinations_checked);
}

function renderUpdates() {
  elements.updatesList.replaceChildren();
  const updates = state.updates.slice(0, 5);
  elements.updatesToggle.hidden = !updates.length;
  elements.updatesPanel.hidden = !updates.length || !state.updatesOpen;
  elements.updatesToggle.setAttribute("aria-expanded", String(Boolean(updates.length && state.updatesOpen)));
  elements.updatesVersion.textContent = state.updatesVersion
    ? `${state.updatesVersion}${state.updatesUpdatedAt ? ` - ${state.updatesUpdatedAt}` : ""}`
    : "";
  if (!updates.length) {
    return;
  }

  for (const update of updates) {
    const item = document.createElement(update.link ? "a" : "article");
    item.className = "update-item";
    if (update.link) {
      item.href = update.link;
      item.target = "_blank";
      item.rel = "noopener noreferrer";
    }

    const meta = document.createElement("div");
    meta.className = "update-meta";

    const type = document.createElement("span");
    type.className = `update-type ${update.type || "notice"}`;
    type.textContent = update.type || "notice";

    const version = formatUpdateVersion(update);
    const versionBadge = document.createElement("span");
    versionBadge.className = "update-version";
    versionBadge.textContent = version;

    const date = document.createElement("time");
    date.dateTime = update.date || "";
    date.textContent = update.date || "Undated";

    const title = document.createElement("h3");
    title.textContent = update.title || "Site update";

    const summary = document.createElement("p");
    summary.textContent = update.summary || "";

    const note = document.createElement("small");
    note.className = "update-note";
    note.textContent = update.note || "";

    meta.append(type);
    if (version) {
      meta.append(versionBadge);
    }
    meta.append(date);
    item.append(meta, title, summary);
    if (update.note) {
      item.append(note);
    }
    elements.updatesList.append(item);
  }
}

function formatUpdateVersion(update) {
  const version = String(update?.version || "").trim();
  if (!version) {
    return "";
  }
  return version.startsWith("v") ? version : `v${version}`;
}

function setUpdatesOpen(isOpen) {
  state.updatesOpen = isOpen && state.updates.length > 0;
  renderUpdates();
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function renderMapSummary() {
  elements.mapSummary.replaceChildren();
  const maps = state.mapsData?.maps || [];
  const standardCount = maps.filter((map) => map.category === "Standard").length;
  const categories = uniqueSorted(maps.map((map) => map.category));

  const stats = [
    ["Total Maps", maps.length],
    ["Standard", standardCount],
    ["Categories", categories.length],
    ["Last Checked", state.mapsData?.last_checked || "Unknown"],
  ];

  for (const [label, value] of stats) {
    const item = document.createElement("div");
    item.innerHTML = `<dt>${label}</dt><dd>${typeof value === "number" ? formatNumber(value) : value}</dd>`;
    elements.mapSummary.append(item);
  }
}

function makeMapFilterButton(label, active, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "map-filter";
  button.classList.toggle("active", active);
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function renderMapFilters() {
  const maps = state.mapsData?.maps || [];
  elements.mapTypeFilters.replaceChildren();
  elements.mapCategoryFilters.replaceChildren();

  const types = ["All", ...uniqueSorted(maps.map((map) => map.objective_type))];
  const categories = ["All", ...uniqueSorted(maps.map((map) => map.category))];

  for (const type of types) {
    elements.mapTypeFilters.append(
      makeMapFilterButton(type, state.selectedMapType === type, () => {
        state.selectedMapType = type;
        renderMaps();
      }),
    );
  }

  for (const category of categories) {
    elements.mapCategoryFilters.append(
      makeMapFilterButton(category, state.selectedMapCategory === category, () => {
        state.selectedMapCategory = category;
        renderMaps();
      }),
    );
  }
}

function renderMapDefinitions() {
  elements.mapDefinitions.replaceChildren();
  for (const definition of state.mapsData?.objective_types || []) {
    const item = document.createElement("article");
    item.className = "map-definition";
    item.innerHTML = `<h4>${definition.name}</h4><p>${definition.summary}</p>`;
    elements.mapDefinitions.append(item);
  }
}

function filteredMaps() {
  const search = state.mapSearch.trim().toLowerCase();
  return (state.mapsData?.maps || []).filter((map) => {
    const matchesType = state.selectedMapType === "All" || map.objective_type === state.selectedMapType;
    const matchesCategory = state.selectedMapCategory === "All" || map.category === state.selectedMapCategory;
    const haystack = [
      map.name,
      map.location,
      map.objective_type,
      map.category,
      ...(map.availability || []),
      map.release || "",
    ].join(" ").toLowerCase();
    return matchesType && matchesCategory && (!search || haystack.includes(search));
  });
}

function renderMapCard(map) {
  const card = document.createElement("article");
  card.className = "map-card";

  const title = document.createElement("div");
  title.className = "map-card-title";
  title.innerHTML = `<h3>${map.name}</h3><span>${map.objective_type}</span>`;

  const facts = document.createElement("dl");
  facts.className = "map-facts";
  facts.innerHTML = `
    <div><dt>Location</dt><dd>${map.location}</dd></div>
    <div><dt>Category</dt><dd>${map.category}</dd></div>
    <div><dt>Availability</dt><dd>${(map.availability || ["Unknown"]).join(", ")}</dd></div>
    <div><dt>Release</dt><dd>${map.release || "Not listed"}</dd></div>
  `;

  card.append(title, facts);
  return card;
}

function renderMapsSource() {
  elements.mapsSource.replaceChildren();
  const source = state.mapsData?.sources?.[0];
  if (!source) {
    return;
  }
  const link = document.createElement("a");
  link.href = source.url;
  link.textContent = "Source";
  link.target = "_blank";
  link.rel = "noreferrer";
  elements.mapsSource.append(link);
}

function renderMaps() {
  if (!state.mapsData) {
    return;
  }
  renderMapSummary();
  renderMapFilters();
  renderMapDefinitions();
  renderMapsSource();

  const maps = filteredMaps();
  const total = state.mapsData.maps.length;
  elements.mapsTitle.textContent = `${formatNumber(maps.length)} of ${formatNumber(total)} maps`;
  elements.mapsList.replaceChildren();

  if (!maps.length) {
    elements.mapsList.append(makeChip("No maps match the current filters", "muted-chip"));
    return;
  }

  for (const map of maps) {
    elements.mapsList.append(renderMapCard(map));
  }
}

function renderHeroFilters() {
  const search = state.search.trim().toLowerCase();
  elements.heroGroups.replaceChildren();

  for (const role of ROLE_ORDER) {
    const heroes = state.heroesByRole.get(role).filter((name) => name.toLowerCase().includes(search));
    if (!heroes.length) {
      continue;
    }

    const section = document.createElement("section");
    const title = document.createElement("div");
    title.className = "role-title";
    title.innerHTML = `<span>${role}</span><span>${heroes.length}</span>`;

    const buttons = document.createElement("div");
    buttons.className = "hero-buttons";

    for (const hero of heroes) {
      const heroData = state.heroesByName.get(hero);
      const control = document.createElement("div");
      control.className = "hero-filter-control";
      control.classList.toggle("included", state.includedHeroes.has(hero));
      control.classList.toggle("excluded", state.excludedHeroes.has(hero));
      control.classList.toggle("detail-active", state.detailHero === hero);

      const includeButton = document.createElement("button");
      includeButton.type = "button";
      includeButton.className = "hero-filter-action include-action";
      includeButton.textContent = "+";
      includeButton.title = state.includedHeroes.has(hero) ? `Remove ${hero} from included heroes` : `Include ${hero}`;
      includeButton.setAttribute("aria-label", includeButton.title);
      includeButton.addEventListener("click", () => toggleHeroFilter(hero, "include"));

      const detailButton = document.createElement("button");
      detailButton.type = "button";
      detailButton.className = "hero-button";
      detailButton.textContent = hero;
      detailButton.title = `Open ${hero} detail (${rolesText(heroData)})`;
      detailButton.addEventListener("click", () => {
        state.detailHero = hero;
        update();
      });

      const excludeButton = document.createElement("button");
      excludeButton.type = "button";
      excludeButton.className = "hero-filter-action exclude-action";
      excludeButton.textContent = "-";
      excludeButton.title = state.excludedHeroes.has(hero) ? `Remove ${hero} from excluded heroes` : `Exclude ${hero}`;
      excludeButton.setAttribute("aria-label", excludeButton.title);
      excludeButton.addEventListener("click", () => toggleHeroFilter(hero, "exclude"));

      control.append(includeButton, detailButton, excludeButton);
      buttons.append(control);
    }

    section.append(title, buttons);
    elements.heroGroups.append(section);
  }
}

function renderSelectedHeroes() {
  elements.selectedHeroes.replaceChildren();

  if (!state.includedHeroes.size && !state.excludedHeroes.size) {
    elements.selectedHeroes.append(makeChip("No hero filters", "muted-chip"));
    return;
  }

  const included = document.createElement("div");
  included.className = "filter-chip-group";
  const includedLabel = document.createElement("span");
  includedLabel.className = "filter-chip-label";
  includedLabel.textContent = "Included";
  included.append(includedLabel);
  if (state.includedHeroes.size) {
    for (const hero of [...state.includedHeroes].sort()) {
      included.append(makeFilterChip(hero, "include"));
    }
  } else {
    included.append(makeChip("Any", "muted-chip"));
  }

  const excluded = document.createElement("div");
  excluded.className = "filter-chip-group";
  const excludedLabel = document.createElement("span");
  excludedLabel.className = "filter-chip-label";
  excludedLabel.textContent = "Excluded";
  excluded.append(excludedLabel);
  if (state.excludedHeroes.size) {
    for (const hero of [...state.excludedHeroes].sort()) {
      excluded.append(makeFilterChip(hero, "exclude"));
    }
  } else {
    excluded.append(makeChip("None", "muted-chip"));
  }

  elements.selectedHeroes.append(included, excluded);
}

function makeFilterChip(hero, filterMode) {
  const heroData = state.heroesByName.get(hero);
  const button = document.createElement("button");
  button.type = "button";
  button.className = `clear-chip ${filterMode}-chip ${heroData?.role || ""}`;
  button.textContent = `${hero} x`;
  button.title = `Remove ${hero} from ${filterMode === "include" ? "included" : "excluded"} heroes`;
  button.addEventListener("click", () => {
    removeHeroFromFilter(hero, filterMode);
  });
  return button;
}

function removeHeroFromFilter(hero, filterMode) {
  if (filterMode === "exclude") {
    state.excludedHeroes.delete(hero);
  } else {
    state.includedHeroes.delete(hero);
  }
  update();
}

function renderBuilderHeroPicker() {
  elements.builderHeroPicker.replaceChildren();

  if (state.builderHeroes.size >= 6) {
    elements.builderHeroPicker.append(makeChip("Team is full", "muted-chip"));
    return;
  }

  const search = state.builderSearch.trim().toLowerCase();
  let hasHeroes = false;

  for (const role of ROLE_ORDER) {
    const heroes = state.heroesByRole
      .get(role)
      .filter((name) => !state.builderHeroes.has(name))
      .filter((name) => !search || name.toLowerCase().includes(search));

    if (!heroes.length) {
      continue;
    }

    hasHeroes = true;
    const section = document.createElement("section");
    const title = document.createElement("div");
    title.className = "role-title";
    title.innerHTML = `<span>${role}</span><span>${heroes.length}</span>`;

    const buttons = document.createElement("div");
    buttons.className = "builder-hero-buttons";

    for (const heroName of heroes) {
      const hero = state.heroesByName.get(heroName);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `builder-hero-button ${hero?.role || ""}`;
      button.textContent = heroName;
      button.title = `Add ${heroName} to builder (${rolesText(hero)})`;
      button.addEventListener("click", () => addHeroToBuilder(heroName));
      buttons.append(button);
    }

    section.append(title, buttons);
    elements.builderHeroPicker.append(section);
  }

  if (!hasHeroes) {
    elements.builderHeroPicker.append(makeChip("No heroes match the search", "muted-chip"));
  }
}

function renderBuilderSelected() {
  elements.builderSelected.replaceChildren();
  if (!state.builderHeroes.size) {
    elements.builderSelected.append(makeChip("No heroes selected", "muted-chip"));
    return;
  }
  for (const heroName of [...state.builderHeroes].sort()) {
    const hero = state.heroesByName.get(heroName);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `clear-chip ${hero?.role || ""}`;
    button.textContent = `${heroName} x`;
    button.title = `Remove ${heroName} from builder`;
    button.addEventListener("click", () => removeHeroFromBuilder(heroName));
    elements.builderSelected.append(button);
  }
  const team = currentBuilderShareTeam();
  if (team) {
    elements.builderSelected.append(makeSavedCompAction("Share Card", () => openShareCard(team, state.builderMode, "builder")));
  }
}

function renderBuilderCurrentStatus() {
  elements.builderCurrentStatus.replaceChildren();
  if (!state.builderHeroes.size) {
    elements.builderCurrentStatus.append(makeChip("Select heroes to inspect enhancement status", "muted-chip"));
    return;
  }
  for (const heroName of [...state.builderHeroes].sort()) {
    const status = selectedHeroStatus(heroName);
    const row = document.createElement("div");
    row.className = `builder-status-row ${status.enhanced ? "enhanced" : "missing"}`;

    const title = document.createElement("strong");
    title.textContent = status.enhanced
      ? `${heroName} enhanced by ${status.activePartners.join(", ")}`
      : `${heroName} missing ${status.partners.join(" or ")}`;
    const details = document.createElement("small");
    details.textContent = status.enhanced
      ? `Missing options: ${status.missingPartners.join(" or ") || "none"}`
      : "Add one listed partner to enhance this hero.";
    row.append(title, details);
    if (status.enhanced) {
      for (const partner of status.activePartners) {
        row.append(renderInlineEffect(heroName, partner));
      }
    }
    elements.builderCurrentStatus.append(row);
  }
}

function renderInlineEffect(heroName, partnerName) {
  const effect = teamupEffect(heroName, partnerName);
  const item = document.createElement("small");
  item.className = "inline-teamup-effect";
  if (!effect || effect.verification_status === "needs_verification") {
    item.textContent = `${partnerName}: effect details need verification.`;
    return item;
  }
  const label = effectAbilityName(effect) ? `${effectAbilityName(effect)}: ` : "";
  item.textContent = `${partnerName} - ${label}${effectSummary(effect)}`;
  return item;
}

function renderTeamupEffectCard(heroName, partnerName) {
  const effect = teamupEffect(heroName, partnerName);
  const officialAbility = officialTeamupAbility(heroName, partnerName);
  const card = document.createElement("article");
  card.className = "teamup-effect-card";

  const title = document.createElement("h4");
  title.textContent = `${heroName} <- ${partnerName}`;

  const ability = document.createElement("p");
  ability.className = "teamup-effect-ability";
  ability.textContent = effect?.ability_name && effect.ability_name !== "Unverified name"
    ? effect.ability_name
    : "Ability name needs verification";

  const base = document.createElement("p");
  const baseLabel = document.createElement("strong");
  baseLabel.textContent = "Base: ";
  base.append(baseLabel, effect?.base_effect || "Needs verification.");

  const enhanced = document.createElement("p");
  const enhancedLabel = document.createElement("strong");
  enhancedLabel.textContent = "Enhanced: ";
  enhanced.append(enhancedLabel, effect?.enhanced_effect || "Needs verification.");

  const meta = document.createElement("small");
  if (effect?.verification_status === "verified_secondary") {
    meta.textContent = "Verified from secondary source.";
  } else if (effect?.verification_status === "needs_verification") {
    meta.textContent = "Effect details need verification.";
  }

  card.append(title, ability, base, enhanced);
  const numbers = renderTeamupNumberBlocks(officialAbility);
  if (numbers) {
    card.append(numbers);
  }
  card.append(meta);
  return card;
}

function renderOfficialStats(stats) {
  const grid = document.createElement("dl");
  grid.className = "official-stat-grid";
  for (const [label, value] of Object.entries(stats || {})) {
    if (!value) {
      continue;
    }
    const item = document.createElement("div");
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    description.textContent = value;
    item.append(term, description);
    grid.append(item);
  }
  if (!grid.children.length) {
    grid.append(makeChip("No official numbers listed", "muted-chip"));
  }
  return grid;
}

function renderTeamupNumberBlocks(ability) {
  if (!ability || (!hasOfficialStats(ability.base_stats) && !hasOfficialStats(ability.enhanced_stats))) {
    return null;
  }

  const statColumns = document.createElement("div");
  statColumns.className = "official-stat-columns teamup-number-columns";

  if (hasOfficialStats(ability.base_stats)) {
    const baseStats = document.createElement("section");
    baseStats.innerHTML = "<h5>Base Numbers</h5>";
    baseStats.append(renderOfficialStats(ability.base_stats));
    statColumns.append(baseStats);
  }

  if (hasOfficialStats(ability.enhanced_stats)) {
    const enhancedStats = document.createElement("section");
    enhancedStats.innerHTML = "<h5>Enhanced Numbers</h5>";
    enhancedStats.append(renderOfficialStats(ability.enhanced_stats));
    statColumns.append(enhancedStats);
  }

  return statColumns;
}

function renderOfficialAbilityCard(ability, variant = "core") {
  const card = document.createElement("article");
  card.className = `official-ability-card ${variant}`;

  const heading = document.createElement("div");
  heading.className = "official-ability-heading";
  const title = document.createElement("h4");
  title.textContent = ability.partner
    ? `${ability.name} <- ${ability.partner}`
    : ability.name;
  const key = document.createElement("span");
  key.textContent = ability.key || ability.stats?.Key || "Key varies";
  heading.append(title, key);

  const description = document.createElement("p");
  description.textContent = ability.description || "No official description listed.";
  card.append(heading, description);

  if (variant === "teamup") {
    const effects = document.createElement("div");
    effects.className = "official-effect-copy";
    const base = document.createElement("p");
    const baseLabel = document.createElement("strong");
    baseLabel.textContent = "Base: ";
    base.append(baseLabel, ability.base_effect || "No official base effect listed.");

    const enhanced = document.createElement("p");
    const enhancedLabel = document.createElement("strong");
    enhancedLabel.textContent = "Enhanced: ";
    enhanced.append(enhancedLabel, ability.enhanced_effect || "No official enhanced effect listed.");
    effects.append(base, enhanced);
    card.append(effects);

    const statColumns = renderTeamupNumberBlocks(ability);
    if (statColumns) {
      card.append(statColumns);
    }
  } else {
    card.append(renderOfficialStats(ability.stats));
  }

  return card;
}

function renderOfficialDetailsSection(heroName) {
  const section = document.createElement("section");
  section.className = "detail-section official-details-section";
  section.innerHTML = "<h3>Official Ability Details</h3>";

  const details = state.heroDetails.get(heroName);
  if (!details) {
    section.append(makeChip("Official details not loaded yet.", "muted-chip"));
    return section;
  }

  const source = document.createElement("a");
  source.className = "official-source-link";
  source.href = details.source_url;
  source.target = "_blank";
  source.rel = "noopener noreferrer";
  source.textContent = "Official hero page";

  const baseStats = document.createElement("section");
  baseStats.className = "official-detail-block";
  baseStats.innerHTML = "<h4>Base Stats</h4>";
  baseStats.append(renderOfficialStats(details.base_stats));

  const teamups = document.createElement("section");
  teamups.className = "official-detail-block";
  teamups.innerHTML = "<h4>Team-Up Ability Numbers</h4>";
  const teamupList = document.createElement("div");
  teamupList.className = "official-ability-list";
  (details.team_up_abilities || []).forEach((ability) =>
    teamupList.append(renderOfficialAbilityCard(ability, "teamup")),
  );
  if (!teamupList.children.length) {
    teamupList.append(makeChip("No official Team-Up numbers listed", "muted-chip"));
  }
  teamups.append(teamupList);

  const abilities = document.createElement("section");
  abilities.className = "official-detail-block";
  abilities.innerHTML = "<h4>Core Abilities</h4>";
  const abilityList = document.createElement("div");
  abilityList.className = "official-ability-list";
  (details.abilities || [])
    .filter((ability) => ability.section !== "Team-Up Abilities")
    .forEach((ability) => abilityList.append(renderOfficialAbilityCard(ability)));
  if (!abilityList.children.length) {
    abilityList.append(makeChip("No official core ability details listed", "muted-chip"));
  }
  abilities.append(abilityList);

  section.append(source, baseStats, teamups, abilities);
  return section;
}

function renderBuilderSuggestions() {
  elements.builderSuggestions.replaceChildren();
  const suggestions = builderSuggestions();
  if (!suggestions.length) {
    elements.builderSuggestions.append(
      makeChip(
        state.builderHeroes.size >= 6 ? "Team is full" : "No completion suggestions",
        "muted-chip",
      ),
    );
    return;
  }
  for (const suggestion of suggestions) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "suggestion-row";
    if (suggestion.immediateEnhancements.length) {
      const enhancedHeroes = suggestion.immediateEnhancements.join(", ");
      button.innerHTML = `
        <span>Add ${suggestion.heroName}</span>
        <strong>${suggestion.immediateEnhancements.length} gap${suggestion.immediateEnhancements.length === 1 ? "" : "s"} fixed</strong>
        <small>${suggestion.roles} - enhances ${enhancedHeroes} - ${formatNumber(suggestion.count)} valid teams</small>
      `;
    } else {
      button.innerHTML = `
        <span>Add ${suggestion.heroName}</span>
        <strong>Completion candidate</strong>
        <small>${suggestion.roles} - appears in ${formatNumber(suggestion.count)} valid teams</small>
      `;
    }
    button.addEventListener("click", () => addHeroToBuilder(suggestion.heroName));
    elements.builderSuggestions.append(button);
  }
}

function renderBuilderMatches() {
  elements.builderMatches.replaceChildren();
  const completions = builderCompletionTeams();
  const selectedCount = state.builderHeroes.size;
  if (!selectedCount) {
    elements.builderStatus.textContent = state.builderNotice || "Pick 1-6 heroes.";
    elements.builderMatches.append(makeChip("Matching teams appear after you select a hero", "muted-chip"));
    return;
  }
  let statusText = `${selectedCount} selected - ${formatNumber(completions.length)} valid completions`;
  if (selectedCount === 6) {
    statusText = selectedTeamIsFullyEnhanced() ? "6 selected - Fully enhanced" : "6 selected - Not fully enhanced";
  } else if (selectedCount > 0 && completions.length === 0) {
    statusText = `${selectedCount} selected - No valid completion`;
  } else if (selectedCount > 0) {
    statusText = `${selectedCount} selected - Can be completed - ${formatNumber(completions.length)} valid completions`;
  }
  elements.builderStatus.textContent = state.builderNotice ? `${state.builderNotice} ${statusText}` : statusText;

  if (!completions.length) {
    elements.builderMatches.append(makeChip("No matching generated teams", "muted-chip"));
    return;
  }
  completions.slice(0, 10).forEach((team) => elements.builderMatches.append(renderMiniTeam(team, "builder", state.builderMode)));
}

function renderSavedComps() {
  elements.savedCompsList.replaceChildren();
  elements.savedCompsCount.textContent = `${state.savedComps.length} saved`;
  elements.saveBuilderComp.disabled = !state.builderHeroes.size;
  elements.savedCompsStatus.textContent = state.savedCompsStatus ||
    (state.savedComps.length ? "" : "Save a team to load or share it later.");

  if (!state.savedComps.length) {
    elements.savedCompsList.append(makeChip("No saved teams yet", "muted-chip"));
    return;
  }

  for (const comp of state.savedComps) {
    const item = document.createElement("article");
    item.className = "saved-comp";

    const title = document.createElement("h4");
    title.textContent = comp.name;

    const meta = document.createElement("small");
    meta.textContent = `${modeLabel(comp.mode)} - ${comp.heroes.length} hero${comp.heroes.length === 1 ? "" : "es"}`;

    const heroes = document.createElement("div");
    heroes.className = "saved-comp-heroes";
    for (const heroName of comp.heroes) {
      const hero = state.heroesByName.get(heroName);
      heroes.append(hero ? heroChip(hero) : makeChip(heroName, "muted-chip"));
    }

    const actions = document.createElement("div");
    actions.className = "saved-comp-actions";
    actions.append(
      makeSavedCompAction("Load", () => loadSavedComp(comp.id)),
      makeSavedCompAction("Copy Link", () => copySavedCompLink(comp.id)),
    );
    const team = savedCompTeam(comp);
    if (team) {
      actions.append(makeSavedCompAction("Share Card", () => openShareCard(team, comp.mode, "saved_team")));
    }
    actions.append(makeSavedCompAction("Delete", () => deleteSavedComp(comp.id), "danger"));

    item.append(title, meta, heroes, actions);
    elements.savedCompsList.append(item);
  }
}

function renderBuilder() {
  renderPlannerWorkflows();
  renderBuilderHeroPicker();
  renderBuilderSelected();
  renderSavedComps();
  renderBuilderCurrentStatus();
  renderBuilderSuggestions();
  renderBuilderMatches();
  renderPlayerPools();
}

function renderPlannerWorkflows() {
  elements.draftWorkflowSummary.textContent = draftWorkflowSummary();
  elements.poolWorkflowSummary.textContent = poolWorkflowSummary();
}

function makeSavedCompAction(label, onClick, variant = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `saved-comp-action ${variant}`.trim();
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function toggleHeroFilter(heroName, filterMode) {
  if (filterMode === "exclude") {
    if (state.excludedHeroes.has(heroName)) {
      state.excludedHeroes.delete(heroName);
    } else {
      state.excludedHeroes.add(heroName);
      state.includedHeroes.delete(heroName);
    }
  } else if (state.includedHeroes.has(heroName)) {
    state.includedHeroes.delete(heroName);
  } else {
    state.includedHeroes.add(heroName);
    state.excludedHeroes.delete(heroName);
  }
  update();
}

function activeHeroNames() {
  return [...state.heroesByName.values()]
    .filter((hero) => hero.active !== false)
    .map((hero) => hero.name)
    .sort((a, b) => a.localeCompare(b));
}

function canUseInBuilder(heroName) {
  const hero = state.heroesByName.get(heroName);
  return Boolean(hero && hero.active !== false);
}

function sanitizeBuilderHeroes() {
  state.builderHeroes = new Set(
    [...state.builderHeroes].filter((heroName) => canUseInBuilder(heroName)).slice(0, 6),
  );
}

function sanitizePlayerPools() {
  state.playerPools.player1 = new Set([...state.playerPools.player1].filter(canUseInBuilder));
  state.playerPools.player2 = new Set([...state.playerPools.player2].filter(canUseInBuilder));
  if (
    state.selectedPoolPair &&
    (!state.playerPools.player1.has(state.selectedPoolPair.firstHero) ||
      !state.playerPools.player2.has(state.selectedPoolPair.secondHero))
  ) {
    state.selectedPoolPair = null;
  }
}

function addHeroToBuilder(heroName) {
  if (!canUseInBuilder(heroName)) {
    state.builderNotice = `${heroName} is not available.`;
    update();
    return;
  }
  if (state.builderHeroes.has(heroName)) {
    state.builderNotice = `${heroName} is already selected.`;
    update();
    return;
  }
  if (state.builderHeroes.size >= 6) {
    state.builderNotice = "Team is full. Remove a hero before adding another.";
    update();
    return;
  }
  state.builderNotice = "";
  state.builderHeroes.add(heroName);
  trackEvent("builder_hero_added", {
    hero_name: heroName,
    builder_mode: state.builderMode,
    selected_count: state.builderHeroes.size,
  });
  update();
}

function poolSourceTeams() {
  return sourceTeams(state.poolMode);
}

function pairCompletionCount(firstHero, secondHero) {
  return poolSourceTeams().filter((team) => teamIncludesHero(team, firstHero) && teamIncludesHero(team, secondHero)).length;
}

function poolPairTeamCompletions(firstHero, secondHero) {
  return poolSourceTeams().filter((team) => teamIncludesHero(team, firstHero) && teamIncludesHero(team, secondHero));
}

function pairRelationship(firstHero, secondHero) {
  const firstEnhanced = (state.teamups.get(firstHero) || []).includes(secondHero);
  const secondEnhanced = (state.teamups.get(secondHero) || []).includes(firstHero);
  let label = "No direct link";
  let score = 0;
  if (firstEnhanced && secondEnhanced) {
    label = "Mutual";
    score = 3;
  } else if (firstEnhanced) {
    label = "Enhances Player 1";
    score = 2;
  } else if (secondEnhanced) {
    label = "Enhances Player 2";
    score = 2;
  }
  return { firstEnhanced, secondEnhanced, label, score };
}

function poolPairStats(firstHero, secondHero) {
  const relationship = pairRelationship(firstHero, secondHero);
  const completions = poolPairTeamCompletions(firstHero, secondHero);
  return {
    firstHero,
    secondHero,
    ...relationship,
    completionCount: completions.length,
    bestTeam: completions[0] || null,
  };
}

function poolHeroesInTeam(team, poolName) {
  const pool = state.playerPools[poolName];
  return teamNames(team).filter((heroName) => pool.has(heroName)).sort((a, b) => a.localeCompare(b));
}

function teamContainsPoolHeroes(team) {
  return poolHeroesInTeam(team, "player1").length > 0 && poolHeroesInTeam(team, "player2").length > 0;
}

function poolTeamPairScore(team) {
  const playerOneHeroes = poolHeroesInTeam(team, "player1");
  const playerTwoHeroes = poolHeroesInTeam(team, "player2");
  let score = 0;
  for (const firstHero of playerOneHeroes) {
    for (const secondHero of playerTwoHeroes) {
      score += pairRelationship(firstHero, secondHero).score;
    }
  }
  return score;
}

function poolTeamName(team) {
  return teamNames(team).sort((a, b) => a.localeCompare(b)).join(" / ");
}

function rankedPoolComps() {
  let teams = poolSourceTeams().filter(teamContainsPoolHeroes);
  if (state.selectedPoolPair) {
    teams = teams.filter((team) =>
      teamIncludesHero(team, state.selectedPoolPair.firstHero) &&
      teamIncludesHero(team, state.selectedPoolPair.secondHero),
    );
  }
  return teams
    .map((team) => ({
      team,
      playerOneHeroes: poolHeroesInTeam(team, "player1"),
      playerTwoHeroes: poolHeroesInTeam(team, "player2"),
      pairScore: poolTeamPairScore(team),
    }))
    .sort(
      (a, b) =>
        b.playerOneHeroes.length + b.playerTwoHeroes.length -
          (a.playerOneHeroes.length + a.playerTwoHeroes.length) ||
        b.pairScore - a.pairScore ||
        poolTeamName(a.team).localeCompare(poolTeamName(b.team)),
    );
}

function draftWorkflowSummary() {
  const selectedCount = state.builderHeroes.size;
  if (!selectedCount) {
    return "No draft heroes selected.";
  }
  const completionCount = builderCompletionTeams().length;
  if (selectedCount === 6) {
    return selectedTeamIsFullyEnhanced() ? "6 heroes selected, fully enhanced." : "6 heroes selected, not fully enhanced.";
  }
  return `${selectedCount} selected, ${formatNumber(completionCount)} valid completions.`;
}

function poolWorkflowSummary() {
  const firstCount = state.playerPools.player1.size;
  const secondCount = state.playerPools.player2.size;
  if (!firstCount && !secondCount) {
    return "No Duo Planner heroes selected.";
  }
  const sharedComps = poolSourceTeams().filter(teamContainsPoolHeroes).length;
  return `${firstCount} vs ${secondCount} heroes, ${formatNumber(sharedComps)} shared comps.`;
}

function rankedPoolPairs() {
  const pairs = [];
  for (const firstHero of state.playerPools.player1) {
    for (const secondHero of state.playerPools.player2) {
      pairs.push(poolPairStats(firstHero, secondHero));
    }
  }
  return pairs.sort(
    (a, b) =>
      b.score - a.score ||
      b.completionCount - a.completionCount ||
      a.firstHero.localeCompare(b.firstHero) ||
      a.secondHero.localeCompare(b.secondHero),
  );
}

function addHeroToPool(poolName, heroName) {
  if (!canUseInBuilder(heroName)) {
    state.poolStatus = `${heroName} is not available.`;
    update();
    return;
  }
  if (state.playerPools[poolName].has(heroName)) {
    state.poolStatus = `${heroName} is already in this pool.`;
    update();
    return;
  }
  state.playerPools[poolName].add(heroName);
  state.poolStatus = "";
  safeWritePlayerPools();
  trackEvent("pool_hero_added", {
    hero_name: heroName,
    pool_name: poolName,
    pool_mode: state.poolMode,
    pool_size: state.playerPools[poolName].size,
  });
  update();
}

function removeHeroFromPool(poolName, heroName) {
  state.playerPools[poolName].delete(heroName);
  if (
    state.selectedPoolPair &&
    (state.selectedPoolPair.firstHero === heroName || state.selectedPoolPair.secondHero === heroName)
  ) {
    state.selectedPoolPair = null;
  }
  state.poolStatus = "";
  safeWritePlayerPools();
  update();
}

function resetPlayerPools() {
  state.playerPools.player1.clear();
  state.playerPools.player2.clear();
  state.selectedPoolPair = null;
  state.poolSearches.player1 = "";
  state.poolSearches.player2 = "";
  state.poolStatus = "";
  elements.poolOneSearch.value = "";
  elements.poolTwoSearch.value = "";
  safeWritePlayerPools();
  update();
}

function loadSampleDuoPools() {
  state.playerPools.player1 = new Set(SAMPLE_DUO_POOLS.player1.filter(canUseInBuilder));
  state.playerPools.player2 = new Set(SAMPLE_DUO_POOLS.player2.filter(canUseInBuilder));
  state.selectedPoolPair = null;
  state.poolSearches.player1 = "";
  state.poolSearches.player2 = "";
  state.poolStatus = "Sample Duo Planner pools loaded.";
  state.activeView = "builder";
  state.builderPanel = "pools";
  elements.poolOneSearch.value = "";
  elements.poolTwoSearch.value = "";
  safeWritePlayerPools();
  trackEvent("duo_sample_pools_loaded", {
    player1_count: state.playerPools.player1.size,
    player2_count: state.playerPools.player2.size,
    pool_mode: state.poolMode,
  });
  update();
}

function buildPoolComp(team) {
  state.builderHeroes = new Set(teamNames(team));
  state.builderMode = state.poolMode;
  state.builderPanel = "draft";
  state.builderSearch = "";
  state.builderNotice = `Loaded Team #${team.team_number} from Duo Planner.`;
  elements.builderHeroSearch.value = "";
  trackEvent("pool_comp_loaded", {
    team_number: team.team_number,
    pool_mode: state.poolMode,
  });
  update();
}

function buildAroundPoolPair(firstHero, secondHero) {
  state.builderHeroes = new Set([firstHero, secondHero]);
  state.builderMode = state.poolMode;
  state.builderPanel = "draft";
  state.builderSearch = "";
  state.builderNotice = `Building around ${firstHero} and ${secondHero}.`;
  elements.builderHeroSearch.value = "";
  trackEvent("pool_pair_loaded", {
    player1_hero: firstHero,
    player2_hero: secondHero,
    pool_mode: state.poolMode,
  });
  update();
}

function selectPoolPair(firstHero, secondHero) {
  state.selectedPoolPair = { firstHero, secondHero };
  state.poolStatus = `Showing comps for ${firstHero} + ${secondHero}.`;
  trackEvent("pool_pair_selected", {
    player1_hero: firstHero,
    player2_hero: secondHero,
    pool_mode: state.poolMode,
  });
  renderPlayerPools();
}

function clearSelectedPoolPair() {
  state.selectedPoolPair = null;
  state.poolStatus = "";
  renderPlayerPools();
}

function poolShareUrl() {
  const params = new URLSearchParams();
  params.set("view", "builder");
  params.set("builderPanel", "pools");
  if (state.playerPools.player1.size) {
    params.set("pool1", [...state.playerPools.player1].sort().join(","));
  }
  if (state.playerPools.player2.size) {
    params.set("pool2", [...state.playerPools.player2].sort().join(","));
  }
  if (state.poolMode !== "all") {
    params.set("poolMode", state.poolMode);
  }
  if (state.selectedPoolPair) {
    params.set("poolPair", `${state.selectedPoolPair.firstHero}|${state.selectedPoolPair.secondHero}`);
  }
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

async function copyPoolsLink() {
  const url = poolShareUrl();
  try {
    await navigator.clipboard.writeText(url);
    state.poolStatus = "Duo Planner link copied.";
  } catch (error) {
    state.poolStatus = url;
  }
  renderPlayerPools();
}

function renderPoolSelected(poolName, target, countTarget) {
  target.replaceChildren();
  const heroes = [...state.playerPools[poolName]].sort();
  countTarget.textContent = `${heroes.length} hero${heroes.length === 1 ? "" : "es"}`;
  if (!heroes.length) {
    target.append(makeChip("No heroes selected", "muted-chip"));
    return;
  }
  for (const heroName of heroes) {
    const hero = state.heroesByName.get(heroName);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `clear-chip ${hero?.role || ""}`;
    button.textContent = `${heroName} x`;
    button.title = `Remove ${heroName}`;
    button.addEventListener("click", () => removeHeroFromPool(poolName, heroName));
    target.append(button);
  }
}

function renderPoolPicker(poolName, target) {
  target.replaceChildren();
  const search = state.poolSearches[poolName].trim().toLowerCase();
  const selected = state.playerPools[poolName];
  const heroes = activeHeroNames()
    .filter((heroName) => !selected.has(heroName))
    .filter((heroName) => !search || heroName.toLowerCase().includes(search))
    .slice(0, 18);

  if (!heroes.length) {
    target.append(makeChip("No heroes match", "muted-chip"));
    return;
  }

  for (const heroName of heroes) {
    const hero = state.heroesByName.get(heroName);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `builder-hero-button ${hero?.role || ""}`;
    button.textContent = heroName;
    button.title = `Add ${heroName} to ${poolName === "player1" ? "Player 1" : "Player 2"}`;
    button.addEventListener("click", () => addHeroToPool(poolName, heroName));
    target.append(button);
  }
}

function renderPoolRecommendations() {
  elements.poolRecommendations.replaceChildren();
  const pairs = rankedPoolPairs();
  if (!state.playerPools.player1.size || !state.playerPools.player2.size) {
    elements.poolRecommendations.append(makeChip("Add heroes to both pools to compare duo options", "muted-chip"));
    return;
  }
  if (!pairs.length) {
    elements.poolRecommendations.append(makeChip("No pairings available", "muted-chip"));
    return;
  }

  for (const pair of pairs.slice(0, 12)) {
    const item = document.createElement("article");
    item.className = `pool-recommendation ${pair.score ? "linked" : ""}`;
    const direction = pair.firstEnhanced && pair.secondEnhanced
      ? "Both heroes are directly enhanced"
      : pair.firstEnhanced
        ? `${pair.firstHero} is enhanced by ${pair.secondHero}`
        : pair.secondEnhanced
          ? `${pair.secondHero} is enhanced by ${pair.firstHero}`
          : "No direct Team-Up link";
    const bestTeamText = pair.bestTeam ? ` - best Team #${pair.bestTeam.team_number}` : "";
    item.innerHTML = `
      <span>${pair.firstHero} + ${pair.secondHero}</span>
      <strong>${pair.label}</strong>
      <small>${direction} - ${formatNumber(pair.completionCount)} valid ${modeLabel(state.poolMode)} teams${bestTeamText}</small>
    `;
    const actions = document.createElement("div");
    actions.className = "pool-card-actions";
    actions.append(
      makeSavedCompAction("Build Pair", () => buildAroundPoolPair(pair.firstHero, pair.secondHero)),
      makeSavedCompAction("View Comps", () => selectPoolPair(pair.firstHero, pair.secondHero)),
    );
    item.append(actions);
    elements.poolRecommendations.append(item);
  }
}

function renderPoolMatrix() {
  elements.poolMatrix.replaceChildren();
  const firstHeroes = [...state.playerPools.player1].sort();
  const secondHeroes = [...state.playerPools.player2].sort();
  if (!firstHeroes.length || !secondHeroes.length) {
    elements.poolMatrix.append(makeChip("Matrix appears after both pools have heroes", "muted-chip"));
    return;
  }

  const table = document.createElement("div");
  table.className = "pool-matrix-table";
  table.style.setProperty("--pool-columns", secondHeroes.length + 1);
  table.append(document.createElement("span"));
  for (const secondHero of secondHeroes) {
    const header = document.createElement("strong");
    header.textContent = secondHero;
    table.append(header);
  }
  for (const firstHero of firstHeroes) {
    const rowHeader = document.createElement("strong");
    rowHeader.textContent = firstHero;
    table.append(rowHeader);
    for (const secondHero of secondHeroes) {
      const pair = poolPairStats(firstHero, secondHero);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `pool-matrix-cell ${pair.score ? "linked" : ""}`;
      const bestTeam = pair.bestTeam ? teamNames(pair.bestTeam).join(", ") : "No full comp";
      button.innerHTML = `
        <span>${pair.label}</span>
        <small>${formatNumber(pair.completionCount)} teams</small>
        <em>Best: ${bestTeam}</em>
      `;
      button.addEventListener("click", () => buildAroundPoolPair(firstHero, secondHero));
      table.append(button);
    }
  }
  elements.poolMatrix.append(table);
}

function renderPoolCompCard(result) {
  const item = renderMiniTeam(result.team, "duo_planner", state.poolMode);
  item.classList.add("pool-comp-card");

  const poolMeta = document.createElement("div");
  poolMeta.className = "pool-comp-meta";

  const playerOne = document.createElement("span");
  playerOne.textContent = `P1: ${result.playerOneHeroes.join(", ")}`;
  const playerTwo = document.createElement("span");
  playerTwo.textContent = `P2: ${result.playerTwoHeroes.join(", ")}`;
  poolMeta.append(playerOne, playerTwo);

  const actions = document.createElement("div");
  actions.className = "pool-card-actions";
  actions.append(makeSavedCompAction("Build This", () => buildPoolComp(result.team)));

  item.append(poolMeta, actions);
  return item;
}

function renderPoolComps() {
  elements.poolComps.replaceChildren();
  if (!state.playerPools.player1.size || !state.playerPools.player2.size) {
    elements.poolComps.append(makeChip("Add heroes to both pools to discover shared comps", "muted-chip"));
    return;
  }

  const header = document.createElement("div");
  header.className = "pool-comps-heading";
  const results = rankedPoolComps();
  const title = document.createElement("strong");
  title.textContent = state.selectedPoolPair
    ? `${formatNumber(results.length)} comps for ${state.selectedPoolPair.firstHero} + ${state.selectedPoolPair.secondHero}`
    : `${formatNumber(results.length)} comps contain heroes from both pools`;
  header.append(title);
  if (state.selectedPoolPair) {
    header.append(makeSavedCompAction("Show All Pool Comps", clearSelectedPoolPair));
  }
  elements.poolComps.append(header);

  if (!results.length) {
    elements.poolComps.append(
      makeChip("No fully enhanced teams contain heroes from both pools in this mode", "muted-chip"),
    );
    return;
  }

  for (const result of results.slice(0, 10)) {
    elements.poolComps.append(renderPoolCompCard(result));
  }
}

function renderPlayerPools() {
  elements.poolStatus.textContent = state.poolStatus;
  renderPoolSelected("player1", elements.poolOneSelected, elements.poolOneCount);
  renderPoolSelected("player2", elements.poolTwoSelected, elements.poolTwoCount);
  renderPoolPicker("player1", elements.poolOnePicker);
  renderPoolPicker("player2", elements.poolTwoPicker);
  renderPoolRecommendations();
  renderPoolMatrix();
  renderPoolComps();
}

function removeHeroFromBuilder(heroName) {
  state.builderHeroes.delete(heroName);
  state.builderNotice = "";
  trackEvent("builder_hero_removed", {
    hero_name: heroName,
    builder_mode: state.builderMode,
    selected_count: state.builderHeroes.size,
  });
  update();
}

function resetBuilder() {
  state.builderHeroes.clear();
  state.builderSearch = "";
  state.builderNotice = "";
  state.savedCompsStatus = "";
  elements.builderHeroSearch.value = "";
  update();
}

function saveCurrentBuilderComp() {
  if (!state.builderHeroes.size) {
    state.savedCompsStatus = "Pick at least one hero before saving.";
    renderSavedComps();
    return;
  }

  const now = new Date().toISOString();
  const heroes = [...state.builderHeroes].sort();
  const key = savedCompKey(heroes, state.builderMode);
  const existing = state.savedComps.find((comp) => savedCompKey(comp.heroes, comp.mode) === key);

  if (existing) {
    existing.name = currentBuilderCompName();
    existing.heroes = heroes;
    existing.mode = state.builderMode;
    existing.updatedAt = now;
    state.savedComps = [existing, ...state.savedComps.filter((comp) => comp.id !== existing.id)];
    state.savedCompsStatus = "Saved team updated.";
    trackEvent("saved_comp_created", {
      builder_mode: state.builderMode,
      hero_count: heroes.length,
      save_type: "updated",
    });
  } else {
    state.savedComps = [
      {
        id: createSavedCompId(),
        name: currentBuilderCompName(),
        heroes,
        mode: state.builderMode,
        createdAt: now,
        updatedAt: now,
      },
      ...state.savedComps,
    ].slice(0, MAX_SAVED_COMPS);
    state.savedCompsStatus = "Team saved locally. Use Copy Link to share it.";
    trackEvent("saved_comp_created", {
      builder_mode: state.builderMode,
      hero_count: heroes.length,
      save_type: "created",
    });
  }

  if (safeWriteSavedComps()) {
    renderSavedComps();
  } else {
    renderSavedComps();
  }
}

function loadSavedComp(compId) {
  const comp = state.savedComps.find((savedComp) => savedComp.id === compId);
  if (!comp) {
    state.savedCompsStatus = "Saved comp not found.";
    renderSavedComps();
    return;
  }
  const heroes = comp.heroes.filter((heroName) => canUseInBuilder(heroName)).slice(0, 6);
  state.builderHeroes = new Set(heroes);
  state.builderMode = normalizeTeamMode(comp.mode);
  state.activeView = "builder";
  state.builderSearch = "";
  state.builderNotice = "";
  elements.builderHeroSearch.value = "";
  state.savedCompsStatus = "Saved comp loaded.";
  trackEvent("saved_comp_loaded", {
    builder_mode: state.builderMode,
    hero_count: heroes.length,
  });
  update();
}

function deleteSavedComp(compId) {
  state.savedComps = state.savedComps.filter((comp) => comp.id !== compId);
  state.savedCompsStatus = "Saved comp deleted.";
  safeWriteSavedComps();
  renderSavedComps();
}

function savedCompUrl(comp) {
  const params = new URLSearchParams();
  params.set("view", "builder");
  params.set("builder", [...comp.heroes].sort().join(","));
  if (comp.mode !== "all") {
    params.set("builderMode", comp.mode);
  }
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

async function copySavedCompLink(compId) {
  const comp = state.savedComps.find((savedComp) => savedComp.id === compId);
  if (!comp) {
    state.savedCompsStatus = "Saved comp not found.";
    renderSavedComps();
    return;
  }
  const url = savedCompUrl(comp);
  try {
    await navigator.clipboard.writeText(url);
    state.savedCompsStatus = "Share link copied.";
  } catch (error) {
    state.savedCompsStatus = url;
  }
  renderSavedComps();
}

function findExactTeam(heroNames, mode) {
  const selected = new Set(heroNames);
  if (selected.size !== 6) {
    return null;
  }
  return sourceTeams(mode).find((team) => {
    const names = new Set(teamNames(team));
    return names.size === selected.size && [...selected].every((heroName) => names.has(heroName));
  }) || null;
}

function savedCompTeam(comp) {
  return findExactTeam(comp.heroes, comp.mode);
}

function currentBuilderShareTeam() {
  return findExactTeam([...state.builderHeroes], state.builderMode);
}

function teamShareText(payload) {
  const title = payload.teamNumber ? `Team #${payload.teamNumber}` : "Fully Enhanced Team";
  const effectLines = payload.activeEffects.map((effect) => {
    const ability = effect.abilityName ? `${effect.abilityName}: ` : "";
    return `${effect.heroName} <- ${effect.partnerName} - ${ability}${effect.summary}`;
  });
  return [
    `${title} - ${modeDetails(payload.mode)}`,
    `Patch: ${payload.patchVersion}`,
    `Heroes: ${payload.heroes.map((hero) => hero.name).join(", ")}`,
    "Team-Ups:",
    ...effectLines,
    "https://insaneweihang.com",
  ].join("\n");
}

function sharePayloadFromTeam(team, mode, source) {
  return {
    teamNumber: team.team_number,
    heroes: [...team.heroes].sort((a, b) => a.name.localeCompare(b.name)),
    mode: normalizeTeamMode(mode),
    patchVersion: state.summary?.patch_version || "Unknown patch",
    activeEffects: activeTeamupEffects(team),
    source,
  };
}

function drawRoundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      line = next;
      continue;
    }
    if (line) {
      lines.push(line);
    }
    line = word;
    if (lines.length === maxLines - 1) {
      break;
    }
  }
  if (line && lines.length < maxLines) {
    lines.push(line);
  }
  for (const [index, value] of lines.entries()) {
    ctx.fillText(value, x, y + index * lineHeight);
  }
  return y + lines.length * lineHeight;
}

function drawShareCard(payload) {
  const canvas = elements.shareCardCanvas;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#f5f2ea";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#1f2a24";
  ctx.fillRect(0, 0, canvas.width, 112);

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 38px Arial, sans-serif";
  ctx.fillText(payload.teamNumber ? `Team #${payload.teamNumber}` : "Fully Enhanced Team", 54, 60);
  ctx.font = "800 22px Arial, sans-serif";
  ctx.fillStyle = "#cbd8ce";
  ctx.fillText(modeDetails(payload.mode), 54, 92);

  ctx.textAlign = "right";
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 24px Arial, sans-serif";
  ctx.fillText("Marvel Rivals Team-Up Generator", 1146, 58);
  ctx.font = "800 18px Arial, sans-serif";
  ctx.fillStyle = "#cbd8ce";
  ctx.fillText("insaneweihang.com", 1146, 88);
  ctx.textAlign = "left";

  const grouped = ROLE_ORDER.flatMap((role) =>
    payload.heroes
      .filter((hero) => payload.mode === "all" || hero.role === role)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((hero) => ({ ...hero, role })),
  );
  const heroes = payload.mode === "all" ? payload.heroes : grouped;
  const cardWidth = 342;
  heroes.forEach((hero, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = 54 + col * 374;
    const y = 148 + row * 116;
    ctx.fillStyle = "#ffffff";
    drawRoundRect(ctx, x, y, cardWidth, 84, 12);
    ctx.fill();
    ctx.fillStyle = roleColor(hero.role);
    drawRoundRect(ctx, x, y, 10, 84, 8);
    ctx.fill();
    ctx.fillStyle = "#1f2a24";
    ctx.font = "900 25px Arial, sans-serif";
    ctx.fillText(hero.name, x + 26, y + 37);
    ctx.fillStyle = "#68746c";
    ctx.font = "800 16px Arial, sans-serif";
    ctx.fillText(hero.role, x + 26, y + 63);
  });

  ctx.fillStyle = "#1f2a24";
  ctx.font = "900 24px Arial, sans-serif";
  ctx.fillText("Active Team-Ups", 54, 414);
  ctx.font = "800 18px Arial, sans-serif";
  ctx.fillStyle = "#344139";
  let y = 450;
  for (const effect of payload.activeEffects.slice(0, 6)) {
    const ability = effect.abilityName || "Effect details need verification";
    y = drawWrappedText(ctx, `${effect.heroName} <- ${effect.partnerName}: ${ability}`, 54, y, 1080, 25, 1) + 8;
  }

  ctx.fillStyle = "#68746c";
  ctx.font = "800 17px Arial, sans-serif";
  ctx.fillText(`Patch ${payload.patchVersion}`, 54, 632);
  ctx.textAlign = "right";
  ctx.fillText("Fully enhanced team card", 1146, 632);
  ctx.textAlign = "left";
}

function openShareCard(team, mode, source) {
  const payload = sharePayloadFromTeam(team, mode, source);
  state.shareCardPayload = payload;
  state.shareCardStatus = "";
  elements.shareCardTitle.textContent = payload.teamNumber ? `Team #${payload.teamNumber}` : "Team Card";
  elements.shareCardStatus.textContent = "";
  elements.shareCardModal.hidden = false;
  drawShareCard(payload);
  trackEvent("share_card_opened", {
    team_mode: payload.mode,
    hero_count: payload.heroes.length,
    share_source: source,
  });
}

function closeShareCard() {
  elements.shareCardModal.hidden = true;
  state.shareCardPayload = null;
  state.shareCardStatus = "";
  elements.shareCardStatus.textContent = "";
}

function shareCardFileName(payload) {
  const teamLabel = payload.teamNumber ? `team-${payload.teamNumber}` : "team";
  return `marvel-rivals-${teamLabel}-${payload.mode}.png`;
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

async function downloadShareCard() {
  if (!state.shareCardPayload) {
    return;
  }
  const blob = await canvasToBlob(elements.shareCardCanvas);
  if (!blob) {
    elements.shareCardStatus.textContent = "Could not create image.";
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = shareCardFileName(state.shareCardPayload);
  link.click();
  URL.revokeObjectURL(url);
  elements.shareCardStatus.textContent = "PNG downloaded.";
  trackEvent("share_card_downloaded", {
    team_mode: state.shareCardPayload.mode,
    hero_count: state.shareCardPayload.heroes.length,
    share_source: state.shareCardPayload.source,
  });
}

async function copyShareCardImage() {
  if (!state.shareCardPayload) {
    return;
  }
  try {
    if (!window.ClipboardItem || !navigator.clipboard?.write) {
      throw new Error("Image clipboard is unavailable.");
    }
    const blob = await canvasToBlob(elements.shareCardCanvas);
    if (!blob) {
      throw new Error("Could not create image.");
    }
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    elements.shareCardStatus.textContent = "Image copied.";
    trackEvent("share_card_copied", {
      team_mode: state.shareCardPayload.mode,
      hero_count: state.shareCardPayload.heroes.length,
      share_source: state.shareCardPayload.source,
      copy_type: "image",
    });
  } catch (error) {
    await copyShareCardText();
    elements.shareCardStatus.textContent = "Image copy is unavailable. Team text copied instead.";
  }
}

async function copyShareCardText() {
  if (!state.shareCardPayload) {
    return;
  }
  const text = teamShareText(state.shareCardPayload);
  try {
    await navigator.clipboard.writeText(text);
    elements.shareCardStatus.textContent = "Team text copied.";
    trackEvent("share_card_copied", {
      team_mode: state.shareCardPayload.mode,
      hero_count: state.shareCardPayload.heroes.length,
      share_source: state.shareCardPayload.source,
      copy_type: "text",
    });
  } catch (error) {
    elements.shareCardStatus.textContent = text;
  }
}

function builderSourceTeams() {
  return sourceTeams(state.builderMode);
}

function teamContainsAll(team, heroNames) {
  const names = new Set(teamNames(team));
  return [...heroNames].every((heroName) => names.has(heroName));
}

function builderCompletionTeams() {
  if (!state.builderHeroes.size) {
    return builderSourceTeams();
  }
  return builderSourceTeams().filter((team) => teamContainsAll(team, state.builderHeroes));
}

function selectedTeamIsFullyEnhanced() {
  if (state.builderHeroes.size !== 6) {
    return false;
  }
  return builderCompletionTeams().some((team) => {
    const names = new Set(teamNames(team));
    return names.size === state.builderHeroes.size && [...state.builderHeroes].every((name) => names.has(name));
  });
}

function selectedHeroStatus(heroName) {
  const partners = state.teamups.get(heroName) || [];
  const activePartners = partners.filter((partner) => state.builderHeroes.has(partner));
  return {
    heroName,
    partners,
    activePartners,
    enhanced: activePartners.length > 0,
    missingPartners: partners.filter((partner) => !state.builderHeroes.has(partner)),
  };
}

function immediateEnhancementsForCandidate(candidateName) {
  return [...state.builderHeroes]
    .filter((heroName) => {
      const status = selectedHeroStatus(heroName);
      return !status.enhanced && status.missingPartners.includes(candidateName);
    })
    .sort((a, b) => a.localeCompare(b));
}

function builderSuggestions() {
  if (state.builderHeroes.size >= 6) {
    return [];
  }
  const completions = builderCompletionTeams();
  const counts = new Map();
  for (const team of completions) {
    for (const hero of team.heroes) {
      if (state.builderHeroes.has(hero.name) || !canUseInBuilder(hero.name)) {
        continue;
      }
      counts.set(hero.name, (counts.get(hero.name) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([heroName, count]) => ({
      heroName,
      count,
      immediateEnhancements: immediateEnhancementsForCandidate(heroName),
      roles: rolesText(state.heroesByName.get(heroName)),
    }))
    .sort(
      (a, b) =>
        b.immediateEnhancements.length - a.immediateEnhancements.length ||
        b.count - a.count ||
        a.heroName.localeCompare(b.heroName),
    )
    .slice(0, 12);
}

function filteredTeams() {
  const source = sourceTeams(state.mode);
  if (!state.includedHeroes.size && !state.excludedHeroes.size) {
    return source;
  }
  return source.filter((team) => {
    const names = new Set(teamNames(team));
    return (
      [...state.includedHeroes].every((hero) => names.has(hero)) &&
      [...state.excludedHeroes].every((hero) => !names.has(hero))
    );
  });
}

function heroChip(hero) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = `hero-chip ${hero.role}`;
  chip.textContent = hero.name;
  const assignedRole = hero.primary_role && hero.primary_role !== hero.role ? `Assigned: ${hero.role}; ` : "";
  chip.title = `Open ${hero.name} detail (${assignedRole}${rolesText(hero)})`;
  chip.addEventListener("click", () => {
    state.detailHero = hero.name;
    update();
  });
  return chip;
}

function detailTeams(heroName, mode = state.mode) {
  const source = sourceTeams(mode);
  return source.filter((team) => teamIncludesHero(team, heroName));
}

function teammateFrequency(heroName, mode = state.mode) {
  const counts = new Map();
  for (const team of detailTeams(heroName, mode)) {
    for (const hero of team.heroes) {
      if (hero.name === heroName) {
        continue;
      }
      counts.set(hero.name, (counts.get(hero.name) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8);
}

function makeChip(text, className = "path-chip") {
  const chip = document.createElement("span");
  chip.className = className;
  chip.textContent = text;
  return chip;
}

function makeDetailAction(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "detail-action";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function teamEffectToggleKey(team, source, mode) {
  return `${source}:${normalizeTeamMode(mode)}:${team.team_number}`;
}

function teamEffectVisible(team, source, mode) {
  const key = teamEffectToggleKey(team, source, mode);
  return state.teamEffectOverrides.has(key)
    ? state.teamEffectOverrides.get(key)
    : state.showTeamupEffects;
}

function toggleTeamEffectOverride(team, source, mode) {
  const key = teamEffectToggleKey(team, source, mode);
  const enabled = !teamEffectVisible(team, source, mode);
  state.teamEffectOverrides.set(key, enabled);
  trackEvent("teamup_effect_card_toggled", {
    enabled,
    source,
    mode: normalizeTeamMode(mode),
    team_number: team.team_number,
  });
  update();
}

function makeTeamEffectToggleButton(team, source, mode) {
  const enabled = teamEffectVisible(team, source, mode);
  const button = makeSavedCompAction(
    enabled ? "Hide Effects" : "Show Effects",
    () => toggleTeamEffectOverride(team, source, mode),
  );
  button.classList.add("team-effect-toggle-action");
  button.setAttribute("aria-pressed", String(enabled));
  return button;
}

function renderMiniTeam(team, source = "builder", mode = state.builderMode) {
  const item = document.createElement("article");
  item.className = "mini-team";
  const showEffects = teamEffectVisible(team, source, mode);

  const title = document.createElement("h3");
  title.textContent = `Team #${team.team_number}`;

  const heroes = document.createElement("div");
  heroes.className = "hero-line";
  team.heroes.forEach((hero) => heroes.append(heroChip(hero)));

  const paths = document.createElement("div");
  paths.className = "paths";
  activeTeamupEffects(team).forEach((effect) => paths.append(renderTeamupPath(effect, showEffects)));

  const actions = document.createElement("div");
  actions.className = "pool-card-actions";
  actions.append(makeTeamEffectToggleButton(team, source, mode));
  actions.append(makeSavedCompAction("Share Card", () => openShareCard(team, mode, source)));

  item.append(title, heroes, paths, actions);
  return item;
}

function renderHeroDetail() {
  elements.heroDetail.replaceChildren();
  if (!state.detailHero) {
    const empty = document.createElement("div");
    empty.className = "detail-empty";
    empty.innerHTML = '<p class="eyebrow">Hero Detail</p><h2>Select a hero</h2>';
    elements.heroDetail.append(empty);
    return;
  }

  const hero = state.heroesByName.get(state.detailHero);
  if (!hero) {
    const missing = document.createElement("div");
    missing.className = "detail-empty";
    missing.innerHTML = '<p class="eyebrow">Hero Detail</p><h2>Hero not found</h2>';
    elements.heroDetail.append(missing);
    return;
  }

  const allHeroTeams = detailTeams(hero.name, "all");
  const recommendedHeroTeams = detailTeams(hero.name, "222");
  const currentHeroTeams = detailTeams(hero.name);
  const sourceCount = sourceTeams(state.mode).length;
  const currentPercent = sourceCount ? Math.round((currentHeroTeams.length / sourceCount) * 100) : 0;
  const partners = state.teamups.get(hero.name) || [];

  const header = document.createElement("div");
  header.className = "detail-header";

  const titleBlock = document.createElement("div");
  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = "Hero Detail";
  const title = document.createElement("h2");
  title.textContent = hero.name;
  titleBlock.append(eyebrow, title);

  const close = document.createElement("button");
  close.type = "button";
  close.className = "icon-button";
  close.textContent = "x";
  close.title = "Clear hero detail";
  close.addEventListener("click", () => {
    state.detailHero = null;
    update();
  });
  header.append(titleBlock, close);

  const roles = document.createElement("div");
  roles.className = "detail-chip-row";
  roles.append(makeChip(`Primary: ${hero.role}`, `hero-chip ${hero.role}`));
  for (const role of eligibleRoles(hero).filter((role) => role !== hero.role)) {
    roles.append(makeChip(role, `hero-chip ${role}`));
  }
  if (hero.active === false) {
    roles.append(makeChip("Inactive", "status-chip"));
  }

  const stats = document.createElement("dl");
  stats.className = "detail-stats";
  stats.innerHTML = `
    <div><dt>All Teams</dt><dd>${formatNumber(allHeroTeams.length)}</dd></div>
    <div><dt>2-2-2</dt><dd>${formatNumber(recommendedHeroTeams.length)}</dd></div>
    <div><dt>Current</dt><dd>${formatNumber(currentHeroTeams.length)}</dd></div>
    <div><dt>Appears In</dt><dd>${currentPercent}%</dd></div>
  `;

  const actions = document.createElement("div");
  actions.className = "detail-actions";
  if (hero.active !== false) {
    const builderLabel = state.builderHeroes.has(hero.name) ? "Remove builder" : "Add builder";
    actions.append(makeDetailAction(builderLabel, () => {
      if (state.builderHeroes.has(hero.name)) {
        removeHeroFromBuilder(hero.name);
      } else {
        addHeroToBuilder(hero.name);
      }
    }));
  }
  actions.append(
    makeDetailAction(state.includedHeroes.has(hero.name) ? "Remove include" : "Include", () =>
      toggleHeroFilter(hero.name, "include"),
    ),
    makeDetailAction(state.excludedHeroes.has(hero.name) ? "Remove exclude" : "Exclude", () =>
      toggleHeroFilter(hero.name, "exclude"),
    ),
  );

  const teamupsSection = document.createElement("section");
  teamupsSection.className = "detail-section";
  teamupsSection.innerHTML = "<h3>Team-Up Effects</h3>";
  const partnerRow = document.createElement("div");
  partnerRow.className = "teamup-effect-list";
  partners.forEach((partner) => partnerRow.append(renderTeamupEffectCard(hero.name, partner)));
  teamupsSection.append(partnerRow);

  const officialDetailsSection = renderOfficialDetailsSection(hero.name);

  const teammatesSection = document.createElement("section");
  teammatesSection.className = "detail-section";
  teammatesSection.innerHTML = "<h3>Best Teammates</h3>";
  const teammateRow = document.createElement("div");
  teammateRow.className = "detail-list";
  for (const [name, count] of teammateFrequency(hero.name)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "teammate-row";
    button.textContent = `${name} ${count}`;
    button.addEventListener("click", () => {
      state.detailHero = name;
      update();
    });
    teammateRow.append(button);
  }
  if (!teammateRow.children.length) {
    teammateRow.append(makeChip("No generated teams"));
  }
  teammatesSection.append(teammateRow);

  const samplesSection = document.createElement("section");
  samplesSection.className = "detail-section";
  samplesSection.innerHTML = "<h3>Sample Teams</h3>";
  const sampleList = document.createElement("div");
  sampleList.className = "sample-list";
  currentHeroTeams.slice(0, 5).forEach((team) => sampleList.append(renderMiniTeam(team, "hero_detail", state.mode)));
  if (!sampleList.children.length) {
    sampleList.append(makeChip("No teams in current mode"));
  }
  samplesSection.append(sampleList);

  elements.heroDetail.append(
    header,
    roles,
    stats,
    actions,
    teamupsSection,
    officialDetailsSection,
    teammatesSection,
    samplesSection,
  );
}

function teamupPathCard(effect) {
  const card = document.createElement("div");
  card.className = "path-chip teamup-trigger";

  const title = document.createElement("strong");
  title.textContent = `${effect.heroName} <- ${effect.partnerName}`;

  const summary = document.createElement("small");
  summary.textContent = effect.abilityName
    ? `${effect.abilityName}: ${effect.summary}`
    : effect.summary;

  card.append(title, summary);
  const numbers = renderTeamupNumberBlocks(effect.officialAbility);
  if (numbers) {
    card.append(numbers);
  }
  return card;
}

function compactTeamupPath(effect) {
  const chip = document.createElement("span");
  chip.className = "path-chip teamup-path-compact";
  chip.textContent = `${effect.heroName} <- ${effect.partnerName}`;
  return chip;
}

function renderTeamupPath(effect, showEffects) {
  return showEffects ? teamupPathCard(effect) : compactTeamupPath(effect);
}

function renderTeam(team) {
  const row = document.createElement("article");
  row.className = "team-row";
  const source = "browser";
  const showEffects = teamEffectVisible(team, source, state.mode);

  const number = document.createElement("div");
  number.className = "team-number";
  number.textContent = `#${team.team_number}`;

  const content = document.createElement("div");
  content.className = "team-content";

  if (state.mode !== "all") {
    const roleGroups = document.createElement("div");
    roleGroups.className = "role-groups";

    for (const role of ROLE_ORDER) {
      const group = document.createElement("div");
      group.className = "role-group";

      const label = document.createElement("span");
      label.className = "role-group-label";
      label.textContent = role;

      const heroes = document.createElement("span");
      heroes.className = "hero-line";
      team.heroes
        .filter((hero) => hero.role === role)
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((hero) => heroes.append(heroChip(hero)));

      group.append(label, heroes);
      roleGroups.append(group);
    }
    content.append(roleGroups);
  } else {
    const heroes = document.createElement("div");
    heroes.className = "hero-line";
    team.heroes.forEach((hero) => heroes.append(heroChip(hero)));
    content.append(heroes);
  }

  const paths = document.createElement("div");
  paths.className = "paths";
  activeTeamupEffects(team).forEach((effect) => paths.append(renderTeamupPath(effect, showEffects)));
  content.append(paths);

  const actions = document.createElement("div");
  actions.className = "pool-card-actions team-row-actions";
  actions.append(makeTeamEffectToggleButton(team, source, state.mode));
  actions.append(makeSavedCompAction("Share Card", () => openShareCard(team, state.mode, "browser")));
  content.append(actions);

  row.append(number, content);
  return row;
}

function renderResults() {
  const teams = filteredTeams();
  const sourceCount = sourceTeams(state.mode).length;
  const suffix = state.mode === "all" ? "teams" : `${modeLabel(state.mode)} teams`;
  elements.resultsTitle.textContent = `${formatNumber(teams.length)} of ${formatNumber(sourceCount)} ${suffix}`;

  elements.markdownLink.href = `data/${modeFilePrefix(state.mode)}_teams.md`;
  elements.jsonLink.href = `data/${modeFilePrefix(state.mode)}_teams.json`;

  elements.teamList.replaceChildren();
  if (!teams.length) {
    elements.statusMessage.textContent = "No matching teams.";
    return;
  }

  const filterSummary = [];
  if (state.includedHeroes.size) {
    filterSummary.push(`Including ${[...state.includedHeroes].sort().join(", ")}`);
  }
  if (state.excludedHeroes.size) {
    filterSummary.push(`Excluding ${[...state.excludedHeroes].sort().join(", ")}`);
  }
  elements.statusMessage.textContent = filterSummary.length
    ? `${filterSummary.join(". ")}.`
    : "Showing generated teams from committed output data.";

  const fragment = document.createDocumentFragment();
  for (const team of teams) {
    fragment.append(renderTeam(team));
  }
  elements.teamList.append(fragment);
}

function setFeedbackStatus(message, stateName = "") {
  elements.feedbackStatus.textContent = message;
  elements.feedbackStatus.className = `feedback-status ${stateName}`.trim();
}

async function submitFeedback(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);

  if (formData.get("website")) {
    setFeedbackStatus("Feedback sent.", "success");
    form.reset();
    return;
  }

  const payload = {
    type: formData.get("type"),
    title: String(formData.get("title") || "").trim(),
    message: String(formData.get("message") || "").trim(),
    contact: String(formData.get("contact") || "").trim(),
    page_url: window.location.href,
  };

  if (!payload.title || !payload.message) {
    setFeedbackStatus("Add a title and message.", "error");
    return;
  }

  elements.feedbackSubmit.disabled = true;
  setFeedbackStatus("Sending...");

  try {
    const response = await fetch(FEEDBACK_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Feedback API returned ${response.status}`);
    }
    trackEvent("feedback_submitted", {
      feedback_type: payload.type,
    });
    setFeedbackStatus("Feedback sent. Thank you.", "success");
    form.reset();
  } catch (error) {
    setFeedbackStatus("Could not send yet. Try Discord or GitHub.", "error");
  } finally {
    elements.feedbackSubmit.disabled = false;
  }
}

function update() {
  setActiveButtons();
  renderHeroFilters();
  renderSelectedHeroes();
  renderBuilder();
  renderMaps();
  renderResults();
  renderHeroDetail();
  writeUrlState();
}

function bindEvents() {
  elements.patchSelect?.addEventListener("change", (event) => {
    const patchId = event.target.value;
    if (!state.patchManifest?.patches?.some((patch) => patch.id === patchId)) {
      return;
    }
    window.localStorage.setItem(PATCH_STORAGE_KEY, patchId);
    const params = new URLSearchParams(window.location.search);
    params.set("patch", patchId);
    window.location.search = params.toString();
  });
  for (const button of elements.viewButtons) {
    button.addEventListener("click", () => {
      if (state.activeView !== button.dataset.view) {
        trackEvent("select_content", {
          content_type: "main_view",
          item_id: button.dataset.view,
        });
      }
      state.activeView = button.dataset.view;
      update();
    });
  }
  for (const button of elements.modeButtons) {
    button.addEventListener("click", () => {
      if (state.mode !== button.dataset.mode) {
        trackEvent("select_content", {
          content_type: "team_set",
          item_id: button.dataset.mode,
        });
      }
      state.mode = normalizeTeamMode(button.dataset.mode);
      update();
    });
  }
  elements.toggleTeamupEffects.addEventListener("change", (event) => {
    state.showTeamupEffects = event.target.checked;
    trackEvent("teamup_effect_display_changed", {
      enabled: state.showTeamupEffects,
    });
    update();
  });
  for (const button of elements.builderModeButtons) {
    button.addEventListener("click", () => {
      if (state.builderMode !== button.dataset.builderMode) {
        trackEvent("builder_mode_changed", {
          builder_mode: button.dataset.builderMode,
        });
      }
      state.builderMode = normalizeTeamMode(button.dataset.builderMode);
      state.builderNotice = "";
      update();
    });
  }
  for (const button of elements.builderPanelButtons) {
    button.addEventListener("click", () => {
      if (state.builderPanel !== button.dataset.builderPanel) {
        trackEvent("select_content", {
          content_type: "planner_workflow",
          item_id: button.dataset.builderPanel,
        });
      }
      state.builderPanel = button.dataset.builderPanel;
      update();
    });
  }
  for (const button of elements.poolModeButtons) {
    button.addEventListener("click", () => {
      if (state.poolMode !== button.dataset.poolMode) {
        trackEvent("select_content", {
          content_type: "pool_mode",
          item_id: button.dataset.poolMode,
        });
      }
      state.poolMode = normalizeTeamMode(button.dataset.poolMode);
      state.poolStatus = "";
      safeWritePlayerPools();
      update();
    });
  }
  elements.heroSearch.addEventListener("input", (event) => {
    state.search = event.target.value;
    if (state.search.trim().length >= 2) {
      trackEvent("search", {
        search_term: state.search.trim(),
        search_context: "team_browser",
      });
    }
    renderHeroFilters();
  });
  elements.builderHeroSearch.addEventListener("input", (event) => {
    state.builderSearch = event.target.value;
    if (state.builderSearch.trim().length >= 2) {
      trackEvent("search", {
        search_term: state.builderSearch.trim(),
        search_context: "team_planner",
      });
    }
    renderBuilderHeroPicker();
  });
  elements.poolOneSearch.addEventListener("input", (event) => {
    state.poolSearches.player1 = event.target.value;
    if (state.poolSearches.player1.trim().length >= 2) {
      trackEvent("search", {
        search_term: state.poolSearches.player1.trim(),
        search_context: "player1_pool",
      });
    }
    renderPlayerPools();
  });
  elements.poolTwoSearch.addEventListener("input", (event) => {
    state.poolSearches.player2 = event.target.value;
    if (state.poolSearches.player2.trim().length >= 2) {
      trackEvent("search", {
        search_term: state.poolSearches.player2.trim(),
        search_context: "player2_pool",
      });
    }
    renderPlayerPools();
  });
  elements.mapSearch.addEventListener("input", (event) => {
    state.mapSearch = event.target.value;
    if (state.mapSearch.trim().length >= 2) {
      trackEvent("search", {
        search_term: state.mapSearch.trim(),
        search_context: "maps",
      });
    }
    renderMaps();
  });
  elements.clearFilters.addEventListener("click", () => {
    state.includedHeroes.clear();
    state.excludedHeroes.clear();
    state.search = "";
    elements.heroSearch.value = "";
    update();
  });
  elements.clearBuilder.addEventListener("click", resetBuilder);
  elements.resetBuilderTeam.addEventListener("click", resetBuilder);
  elements.saveBuilderComp.addEventListener("click", saveCurrentBuilderComp);
  elements.showPlayerPools.addEventListener("click", () => {
    trackEvent("select_content", {
      content_type: "planner_workflow",
      item_id: "pools",
    });
    state.builderPanel = "pools";
    update();
  });
  elements.trySamplePools.addEventListener("click", loadSampleDuoPools);
  elements.copyPoolsLink.addEventListener("click", copyPoolsLink);
  elements.resetPlayerPools.addEventListener("click", resetPlayerPools);
  elements.updatesToggle.addEventListener("click", () => setUpdatesOpen(!state.updatesOpen));
  elements.updatesClose.addEventListener("click", () => setUpdatesOpen(false));
  elements.shareCardClose.addEventListener("click", closeShareCard);
  elements.shareCardModal.addEventListener("click", (event) => {
    if (event.target === elements.shareCardModal) {
      closeShareCard();
    }
  });
  elements.downloadShareCard.addEventListener("click", downloadShareCard);
  elements.copyShareCardImage.addEventListener("click", copyShareCardImage);
  elements.copyShareCardText.addEventListener("click", copyShareCardText);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.shareCardModal.hidden) {
      closeShareCard();
      return;
    }
    if (event.key === "Escape" && state.updatesOpen) {
      setUpdatesOpen(false);
    }
  });
  elements.feedbackForm.addEventListener("submit", submitFeedback);
  for (const link of document.querySelectorAll(".header-actions a[target='_blank'], .footer-social-links a[target='_blank']")) {
    link.addEventListener("click", () => {
      trackEvent("outbound_social_clicked", {
        link_label: link.getAttribute("title") || link.getAttribute("aria-label") || "unknown",
        link_url: link.href,
      });
    });
  }
}

async function init() {
  try {
    readUrlState();
    bindEvents();
    const manifest = await loadJson(PATCH_MANIFEST_FILE);
    const patches = Array.isArray(manifest.patches) ? manifest.patches : [];
    const patchIds = new Set(
      patches.filter((patch) => patch.available !== false).map((patch) => patch.id),
    );
    const storedPatch = window.localStorage.getItem(PATCH_STORAGE_KEY);
    const requestedPatch = state.patchId || storedPatch || manifest.default_patch;
    state.patchManifest = manifest;
    state.patchId = patchIds.has(requestedPatch) ? requestedPatch : manifest.default_patch;
    const selectedPatch = patches.find((patch) => patch.id === state.patchId);
    if (!selectedPatch) {
      throw new Error("No valid default patch is configured.");
    }
    const dataFiles = patchDataFiles(selectedPatch);
    const [
      summary,
      heroes,
      teamups,
      teamupEffects,
      heroDetails,
      mapsData,
      updatesData,
      ...teamPayloads
    ] = await Promise.all([
      loadJson(dataFiles.summary),
      loadJson(dataFiles.heroes),
      loadJson(dataFiles.teamups),
      loadJson(dataFiles.teamupEffects),
      loadJson(dataFiles.heroDetails),
      loadJson(dataFiles.maps),
      loadJson(dataFiles.updates),
      ...TEAM_MODE_KEYS.map((key) => loadJson(dataFiles[key])),
    ]);
    state.summary = summary;
    state.mapsData = mapsData;
    state.updates = Array.isArray(updatesData.updates) ? updatesData.updates : [];
    state.updatesVersion = String(updatesData.current_version || "");
    state.updatesUpdatedAt = String(updatesData.updated_at || "");
    state.heroesByName = new Map(heroes.heroes.map((hero) => [hero.name, hero]));
    state.teamups = new Map(Object.entries(teamups.teamups));
    state.teamupEffects = new Map(
      Object.entries(teamupEffects.effects || {}).flatMap(([heroName, effects]) =>
        Array.isArray(effects) ? effects.map((effect) => [effectKey(heroName, effect.partner), effect]) : [],
      ),
    );
    state.heroDetails = new Map(Object.entries(heroDetails.heroes || {}));
    TEAM_MODE_KEYS.forEach((key, index) => {
      state.teams[key] = teamPayloads[index].teams;
    });
    state.savedComps = safeReadSavedComps();
    const storedPools = safeReadPlayerPools();
    const params = new URLSearchParams(window.location.search);
    if (!params.has("pool1") && !params.has("pool2")) {
      state.playerPools.player1 = new Set(storedPools.player1);
      state.playerPools.player2 = new Set(storedPools.player2);
    }
    if (!params.has("poolMode")) {
      state.poolMode = storedPools.mode;
    }
    sanitizeBuilderHeroes();
    deriveHeroes();
    sanitizePlayerPools();
    normalizeSavedComps();
    renderSummary();
    renderUpdates();
    update();
  } catch (error) {
    elements.statusMessage.textContent = error.message;
    elements.resultsTitle.textContent = "Unable to load data";
  }
}

init();
