const DATA_FILES = {
  summary: "data/summary.json",
  heroes: "data/heroes.json",
  teamups: "data/teamups.json",
  all: "data/all_fully_enhanced_teams.json",
  balanced: "data/fully_enhanced_222_teams.json",
};

const ROLE_ORDER = ["Vanguard", "Duelist", "Strategist"];
const state = {
  activeView: "browser",
  mode: "all",
  filterMode: "include",
  selectedHeroes: new Set(),
  builderHeroes: new Set(),
  builderMode: "all",
  detailHero: null,
  search: "",
  summary: null,
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
  filterModeButtons: document.querySelectorAll("[data-filter-mode]"),
  builderModeButtons: document.querySelectorAll("[data-builder-mode]"),
  clearBuilder: document.querySelector("#clear-builder"),
  builderSelected: document.querySelector("#builder-selected"),
  builderStatus: document.querySelector("#builder-status"),
  builderCurrentStatus: document.querySelector("#builder-current-status"),
  builderSuggestions: document.querySelector("#builder-suggestions"),
  builderMatches: document.querySelector("#builder-matches"),
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

function deriveHeroes() {
  const roles = new Map(ROLE_ORDER.map((role) => [role, new Set()]));
  for (const hero of state.heroesByName.values()) {
    if (hero.active === false) {
      continue;
    }
    roles.get(hero.role).add(hero.name);
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

  if (view === "builder" || view === "browser") {
    state.activeView = view;
  }
  if (mode === "222") {
    state.mode = "222";
  }
  if (exclude) {
    state.filterMode = "exclude";
    state.selectedHeroes = new Set(exclude.split(",").map(decodeURIComponent).filter(Boolean));
  } else if (include) {
    state.filterMode = "include";
    state.selectedHeroes = new Set(include.split(",").map(decodeURIComponent).filter(Boolean));
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
  if (state.activeView === "builder" || state.builderHeroes.size) {
    params.set("view", state.activeView);
  }
  if (state.mode === "222") {
    params.set("mode", "222");
  }
  if (state.selectedHeroes.size) {
    const key = state.filterMode === "exclude" ? "exclude" : "include";
    params.set(key, [...state.selectedHeroes].sort().join(","));
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
  for (const button of elements.filterModeButtons) {
    button.classList.toggle("active", button.dataset.filterMode === state.filterMode);
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
      const button = document.createElement("button");
      button.type = "button";
      button.className = "hero-button";
      button.textContent = hero;
      button.classList.toggle("active", state.selectedHeroes.has(hero));
      button.title = `Open ${hero} detail`;
      button.addEventListener("click", () => {
        state.detailHero = hero;
        update();
      });
      buttons.append(button);
    }

    section.append(title, buttons);
    elements.heroGroups.append(section);
  }
}

function renderSelectedHeroes() {
  elements.selectedHeroes.replaceChildren();
  for (const hero of [...state.selectedHeroes].sort()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "clear-chip";
    button.textContent = `${hero} x`;
    button.title = `Remove ${hero}`;
    button.addEventListener("click", () => {
      state.selectedHeroes.delete(hero);
      update();
    });
    elements.selectedHeroes.append(button);
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
    row.append(title);
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
    const helps = suggestion.immediateEnhancements.length
      ? `helps ${suggestion.immediateEnhancements.join(", ")}`
      : "completion candidate";
    button.innerHTML = `<span>${suggestion.heroName}</span><small>${suggestion.role} - ${formatNumber(suggestion.count)} teams - ${helps}</small>`;
    button.addEventListener("click", () => addHeroToBuilder(suggestion.heroName));
    elements.builderSuggestions.append(button);
  }
}

function renderBuilderMatches() {
  elements.builderMatches.replaceChildren();
  const completions = builderCompletionTeams();
  const selectedCount = state.builderHeroes.size;
  if (!selectedCount) {
    elements.builderStatus.textContent = "Pick 1-6 heroes.";
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
  elements.builderStatus.textContent = statusText;

  if (!completions.length) {
    elements.builderMatches.append(makeChip("No matching generated teams", "muted-chip"));
    return;
  }
  completions.slice(0, 10).forEach((team) => elements.builderMatches.append(renderMiniTeam(team)));
}

function renderBuilder() {
  renderBuilderSelected();
  renderBuilderCurrentStatus();
  renderBuilderSuggestions();
  renderBuilderMatches();
}

function addHeroToFilter(heroName, filterMode) {
  state.filterMode = filterMode;
  state.selectedHeroes.add(heroName);
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
  if (!canUseInBuilder(heroName) || state.builderHeroes.has(heroName) || state.builderHeroes.size >= 6) {
    return;
  }
  state.builderHeroes.add(heroName);
  update();
}

function removeHeroFromBuilder(heroName) {
  state.builderHeroes.delete(heroName);
  update();
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
    .filter((heroName) => (state.teamups.get(heroName) || []).includes(candidateName))
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
      role: state.heroesByName.get(heroName).role,
    }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        b.immediateEnhancements.length - a.immediateEnhancements.length ||
        a.heroName.localeCompare(b.heroName),
    )
    .slice(0, 12);
}

function filteredTeams() {
  const source = state.mode === "222" ? state.teams.balanced : state.teams.all;
  if (!state.selectedHeroes.size) {
    return source;
  }
  return source.filter((team) => {
    const names = new Set(teamNames(team));
    if (state.filterMode === "exclude") {
      return [...state.selectedHeroes].every((hero) => !names.has(hero));
    }
    return [...state.selectedHeroes].every((hero) => names.has(hero));
  });
}

function heroChip(hero) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = `hero-chip ${hero.role}`;
  chip.textContent = hero.name;
  chip.title = `Open ${hero.name} detail`;
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
  for (const role of hero.roles || [hero.role]) {
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
    makeDetailAction("Include hero", () => addHeroToFilter(hero.name, "include")),
    makeDetailAction("Exclude hero", () => addHeroToFilter(hero.name, "exclude")),
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

  elements.statusMessage.textContent = state.selectedHeroes.size
    ? `${state.filterMode === "include" ? "Including" : "Excluding"} ${[...state.selectedHeroes].sort().join(", ")}.`
    : "Showing generated teams from committed output data.";

  const fragment = document.createDocumentFragment();
  for (const team of teams) {
    fragment.append(renderTeam(team));
  }
  elements.teamList.append(fragment);
}

function update() {
  setActiveButtons();
  renderHeroFilters();
  renderSelectedHeroes();
  renderBuilder();
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
  for (const button of elements.filterModeButtons) {
    button.addEventListener("click", () => {
      state.filterMode = button.dataset.filterMode;
      update();
    });
  }
  for (const button of elements.builderModeButtons) {
    button.addEventListener("click", () => {
      state.builderMode = button.dataset.builderMode;
      update();
    });
  }
  elements.heroSearch.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderHeroFilters();
  });
  elements.clearFilters.addEventListener("click", () => {
    state.selectedHeroes.clear();
    state.search = "";
    elements.heroSearch.value = "";
    update();
  });
  elements.clearBuilder.addEventListener("click", () => {
    state.builderHeroes.clear();
    update();
  });
}

async function init() {
  try {
    readUrlState();
    bindEvents();
    const [summary, heroes, teamups, allTeams, balancedTeams] = await Promise.all([
      loadJson(DATA_FILES.summary),
      loadJson(DATA_FILES.heroes),
      loadJson(DATA_FILES.teamups),
      loadJson(DATA_FILES.all),
      loadJson(DATA_FILES.balanced),
    ]);
    state.summary = summary;
    state.heroesByName = new Map(heroes.heroes.map((hero) => [hero.name, hero]));
    state.teamups = new Map(Object.entries(teamups.teamups));
    state.teams.all = allTeams.teams;
    state.teams.balanced = balancedTeams.teams;
    sanitizeBuilderHeroes();
    deriveHeroes();
    renderSummary();
    update();
  } catch (error) {
    elements.statusMessage.textContent = error.message;
    elements.resultsTitle.textContent = "Unable to load data";
  }
}

init();

