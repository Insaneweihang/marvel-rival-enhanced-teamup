const DATA_FILES = {
  summary: "data/summary.json",
  heroes: "data/heroes.json",
  teamups: "data/teamups.json",
  maps: "data/maps.json",
  updates: "data/updates.json",
  all: "data/all_fully_enhanced_teams.json",
  balanced: "data/fully_enhanced_222_teams.json",
};

const FEEDBACK_ENDPOINT = "https://marvel-rivals-feedback.insaneweihang.workers.dev/feedback";
const SAVED_COMPS_KEY = "marvel-rivals:saved-comps:v1";
const MAX_SAVED_COMPS = 20;
const ROLE_ORDER = ["Vanguard", "Duelist", "Strategist"];
const state = {
  activeView: "browser",
  mode: "all",
  includedHeroes: new Set(),
  excludedHeroes: new Set(),
  builderHeroes: new Set(),
  builderMode: "all",
  builderNotice: "",
  detailHero: null,
  search: "",
  builderSearch: "",
  mapSearch: "",
  selectedMapType: "All",
  selectedMapCategory: "All",
  savedComps: [],
  savedCompsStatus: "",
  updates: [],
  updatesOpen: false,
  summary: null,
  mapsData: null,
  heroesByName: new Map(),
  teamups: new Map(),
  teams: {
    all: [],
    balanced: [],
  },
  heroesByRole: new Map(),
};

const elements = {
  patchVersion: document.querySelector("#patch-version"),
  allCount: document.querySelector("#all-count"),
  balancedCount: document.querySelector("#balanced-count"),
  checkedCount: document.querySelector("#checked-count"),
  viewButtons: document.querySelectorAll("[data-view]"),
  appViews: document.querySelectorAll(".app-view"),
  modeButtons: document.querySelectorAll("[data-mode]"),
  builderModeButtons: document.querySelectorAll("[data-builder-mode]"),
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
  savedCompsStatus: document.querySelector("#saved-comps-status"),
  savedCompsList: document.querySelector("#saved-comps-list"),
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
  updatesList: document.querySelector("#updates-list"),
  feedbackForm: document.querySelector("#feedback-form"),
  feedbackSubmit: document.querySelector("#feedback-submit"),
  feedbackStatus: document.querySelector("#feedback-status"),
};

function formatNumber(value) {
  return Number(value).toLocaleString("en-US");
}

async function loadJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Could not load ${path}: ${response.status}`);
  }
  return response.json();
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
        mode: comp.mode === "222" ? "222" : "all",
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
      mode: comp.mode === "222" ? "222" : "all",
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
  const view = params.get("view");
  const mode = params.get("mode");
  const include = params.get("include");
  const exclude = params.get("exclude");
  const detail = params.get("detail");
  const builder = params.get("builder");
  const builderMode = params.get("builderMode");

  if (view === "builder" || view === "browser" || view === "maps") {
    state.activeView = view;
  }
  if (mode === "222") {
    state.mode = "222";
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
  if (builderMode === "222") {
    state.builderMode = "222";
  }
}

function writeUrlState() {
  const params = new URLSearchParams();
  if (state.activeView !== "browser" || state.builderHeroes.size) {
    params.set("view", state.activeView);
  }
  if (state.mode === "222") {
    params.set("mode", "222");
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
  if (state.builderMode === "222") {
    params.set("builderMode", "222");
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
    button.classList.toggle("active", button.dataset.mode === state.mode);
  }
  for (const button of elements.builderModeButtons) {
    button.classList.toggle("active", button.dataset.builderMode === state.builderMode);
  }
}

function renderSummary() {
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

    const date = document.createElement("time");
    date.dateTime = update.date || "";
    date.textContent = update.date || "Undated";

    const title = document.createElement("h3");
    title.textContent = update.title || "Site update";

    const summary = document.createElement("p");
    summary.textContent = update.summary || "";

    meta.append(type, date);
    item.append(meta, title, summary);
    elements.updatesList.append(item);
  }
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
    elements.builderCurrentStatus.append(row);
  }
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
  completions.slice(0, 10).forEach((team) => elements.builderMatches.append(renderMiniTeam(team)));
}

function renderSavedComps() {
  elements.savedCompsList.replaceChildren();
  elements.saveBuilderComp.disabled = !state.builderHeroes.size;
  elements.savedCompsStatus.textContent = state.savedCompsStatus;

  if (!state.savedComps.length) {
    elements.savedCompsList.append(makeChip("No saved comps yet", "muted-chip"));
    return;
  }

  for (const comp of state.savedComps) {
    const item = document.createElement("article");
    item.className = "saved-comp";

    const title = document.createElement("h4");
    title.textContent = comp.name;

    const meta = document.createElement("small");
    meta.textContent = `${comp.mode === "222" ? "2-2-2" : "All"} - ${comp.heroes.length} hero${comp.heroes.length === 1 ? "" : "es"}`;

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
      makeSavedCompAction("Delete", () => deleteSavedComp(comp.id), "danger"),
    );

    item.append(title, meta, heroes, actions);
    elements.savedCompsList.append(item);
  }
}

function renderBuilder() {
  renderBuilderHeroPicker();
  renderBuilderSelected();
  renderSavedComps();
  renderBuilderCurrentStatus();
  renderBuilderSuggestions();
  renderBuilderMatches();
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
  update();
}

function removeHeroFromBuilder(heroName) {
  state.builderHeroes.delete(heroName);
  state.builderNotice = "";
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
    state.savedCompsStatus = "Existing saved comp updated instead of duplicated.";
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
    state.savedCompsStatus = "Comp saved locally.";
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
  state.builderMode = comp.mode === "222" ? "222" : "all";
  state.activeView = "builder";
  state.builderSearch = "";
  state.builderNotice = "";
  elements.builderHeroSearch.value = "";
  state.savedCompsStatus = "Saved comp loaded.";
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
  if (comp.mode === "222") {
    params.set("builderMode", "222");
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

function builderSourceTeams() {
  return state.builderMode === "222" ? state.teams.balanced : state.teams.all;
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
  const source = state.mode === "222" ? state.teams.balanced : state.teams.all;
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
  const source = mode === "222" ? state.teams.balanced : state.teams.all;
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

function renderMiniTeam(team) {
  const item = document.createElement("article");
  item.className = "mini-team";

  const title = document.createElement("h3");
  title.textContent = `Team #${team.team_number}`;

  const heroes = document.createElement("div");
  heroes.className = "hero-line";
  team.heroes.forEach((hero) => heroes.append(heroChip(hero)));

  const paths = document.createElement("div");
  paths.className = "paths";
  team.heroes.forEach((hero) => paths.append(pathChip(hero)));

  item.append(title, heroes, paths);
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
  const balancedHeroTeams = detailTeams(hero.name, "222");
  const currentHeroTeams = detailTeams(hero.name);
  const sourceCount = state.mode === "222" ? state.teams.balanced.length : state.teams.all.length;
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
    <div><dt>2-2-2</dt><dd>${formatNumber(balancedHeroTeams.length)}</dd></div>
    <div><dt>Current</dt><dd>${formatNumber(currentHeroTeams.length)}</dd></div>
    <div><dt>Share</dt><dd>${currentPercent}%</dd></div>
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
  teamupsSection.innerHTML = "<h3>Team-Up Partners</h3>";
  const partnerRow = document.createElement("div");
  partnerRow.className = "detail-chip-row";
  partners.forEach((partner) => partnerRow.append(makeChip(`${hero.name} <- ${partner}`)));
  teamupsSection.append(partnerRow);

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
  currentHeroTeams.slice(0, 5).forEach((team) => sampleList.append(renderMiniTeam(team)));
  if (!sampleList.children.length) {
    sampleList.append(makeChip("No teams in current mode"));
  }
  samplesSection.append(sampleList);

  elements.heroDetail.append(header, roles, stats, actions, teamupsSection, teammatesSection, samplesSection);
}

function pathChip(hero) {
  const chip = document.createElement("span");
  chip.className = "path-chip";
  chip.textContent = `${hero.name} <- ${hero.active_partners.join(", ")}`;
  return chip;
}

function renderTeam(team) {
  const row = document.createElement("article");
  row.className = "team-row";

  const number = document.createElement("div");
  number.className = "team-number";
  number.textContent = `#${team.team_number}`;

  const content = document.createElement("div");
  content.className = "team-content";

  if (state.mode === "222") {
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
      content.append(group);
    }
  } else {
    const heroes = document.createElement("div");
    heroes.className = "hero-line";
    team.heroes.forEach((hero) => heroes.append(heroChip(hero)));
    content.append(heroes);
  }

  const paths = document.createElement("div");
  paths.className = "paths";
  team.heroes.forEach((hero) => paths.append(pathChip(hero)));
  content.append(paths);

  row.append(number, content);
  return row;
}

function renderResults() {
  const teams = filteredTeams();
  const sourceCount = state.mode === "222" ? state.teams.balanced.length : state.teams.all.length;
  const suffix = state.mode === "222" ? "2-2-2 teams" : "teams";
  elements.resultsTitle.textContent = `${formatNumber(teams.length)} of ${formatNumber(sourceCount)} ${suffix}`;

  elements.markdownLink.href =
    state.mode === "222"
      ? "data/fully_enhanced_222_teams.md"
      : "data/all_fully_enhanced_teams.md";
  elements.jsonLink.href =
    state.mode === "222"
      ? "data/fully_enhanced_222_teams.json"
      : "data/all_fully_enhanced_teams.json";

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
  for (const button of elements.viewButtons) {
    button.addEventListener("click", () => {
      state.activeView = button.dataset.view;
      update();
    });
  }
  for (const button of elements.modeButtons) {
    button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      update();
    });
  }
  for (const button of elements.builderModeButtons) {
    button.addEventListener("click", () => {
      state.builderMode = button.dataset.builderMode;
      state.builderNotice = "";
      update();
    });
  }
  elements.heroSearch.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderHeroFilters();
  });
  elements.builderHeroSearch.addEventListener("input", (event) => {
    state.builderSearch = event.target.value;
    renderBuilderHeroPicker();
  });
  elements.mapSearch.addEventListener("input", (event) => {
    state.mapSearch = event.target.value;
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
  elements.updatesToggle.addEventListener("click", () => setUpdatesOpen(!state.updatesOpen));
  elements.updatesClose.addEventListener("click", () => setUpdatesOpen(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.updatesOpen) {
      setUpdatesOpen(false);
    }
  });
  elements.feedbackForm.addEventListener("submit", submitFeedback);
}

async function init() {
  try {
    readUrlState();
    bindEvents();
    const [summary, heroes, teamups, mapsData, updatesData, allTeams, balancedTeams] = await Promise.all([
      loadJson(DATA_FILES.summary),
      loadJson(DATA_FILES.heroes),
      loadJson(DATA_FILES.teamups),
      loadJson(DATA_FILES.maps),
      loadJson(DATA_FILES.updates),
      loadJson(DATA_FILES.all),
      loadJson(DATA_FILES.balanced),
    ]);
    state.summary = summary;
    state.mapsData = mapsData;
    state.updates = Array.isArray(updatesData.updates) ? updatesData.updates : [];
    state.heroesByName = new Map(heroes.heroes.map((hero) => [hero.name, hero]));
    state.teamups = new Map(Object.entries(teamups.teamups));
    state.teams.all = allTeams.teams;
    state.teams.balanced = balancedTeams.teams;
    state.savedComps = safeReadSavedComps();
    sanitizeBuilderHeroes();
    deriveHeroes();
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

