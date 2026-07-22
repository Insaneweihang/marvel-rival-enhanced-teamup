const DATA_FILES = {
  summary: "data/summary.json",
  all: "data/all_fully_enhanced_teams.json",
  balanced: "data/fully_enhanced_222_teams.json",
};

const ROLE_ORDER = ["Vanguard", "Duelist", "Strategist"];
const state = {
  mode: "all",
  filterMode: "include",
  selectedHeroes: new Set(),
  search: "",
  summary: null,
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
  modeButtons: document.querySelectorAll("[data-mode]"),
  filterModeButtons: document.querySelectorAll("[data-filter-mode]"),
  heroSearch: document.querySelector("#hero-search"),
  clearFilters: document.querySelector("#clear-filters"),
  selectedHeroes: document.querySelector("#selected-heroes"),
  heroGroups: document.querySelector("#hero-groups"),
  resultsTitle: document.querySelector("#results-title"),
  statusMessage: document.querySelector("#status-message"),
  teamList: document.querySelector("#team-list"),
  markdownLink: document.querySelector("#markdown-link"),
  jsonLink: document.querySelector("#json-link"),
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

function deriveHeroes() {
  const roles = new Map(ROLE_ORDER.map((role) => [role, new Set()]));
  for (const team of state.teams.all) {
    for (const hero of team.heroes) {
      roles.get(hero.role).add(hero.name);
    }
  }
  state.heroesByRole = new Map(
    ROLE_ORDER.map((role) => [role, [...roles.get(role)].sort((a, b) => a.localeCompare(b))]),
  );
}

function readUrlState() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  const include = params.get("include");
  const exclude = params.get("exclude");

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
}

function writeUrlState() {
  const params = new URLSearchParams();
  if (state.mode === "222") {
    params.set("mode", "222");
  }
  if (state.selectedHeroes.size) {
    const key = state.filterMode === "exclude" ? "exclude" : "include";
    params.set(key, [...state.selectedHeroes].sort().map(encodeURIComponent).join(","));
  }
  const query = params.toString();
  const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
  window.history.replaceState(null, "", nextUrl);
}

function setActiveButtons() {
  for (const button of elements.modeButtons) {
    button.classList.toggle("active", button.dataset.mode === state.mode);
  }
  for (const button of elements.filterModeButtons) {
    button.classList.toggle("active", button.dataset.filterMode === state.filterMode);
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
      button.addEventListener("click", () => {
        if (state.selectedHeroes.has(hero)) {
          state.selectedHeroes.delete(hero);
        } else {
          state.selectedHeroes.add(hero);
        }
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
  const chip = document.createElement("span");
  chip.className = `hero-chip ${hero.role}`;
  chip.textContent = hero.name;
  return chip;
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
      ? "../output/fully_enhanced_222_teams.md"
      : "../output/all_fully_enhanced_teams.md";
  elements.jsonLink.href =
    state.mode === "222"
      ? "../output/fully_enhanced_222_teams.json"
      : "../output/all_fully_enhanced_teams.json";

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
  renderResults();
  writeUrlState();
}

function bindEvents() {
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
}

async function init() {
  try {
    readUrlState();
    bindEvents();
    const [summary, allTeams, balancedTeams] = await Promise.all([
      loadJson(DATA_FILES.summary),
      loadJson(DATA_FILES.all),
      loadJson(DATA_FILES.balanced),
    ]);
    state.summary = summary;
    state.teams.all = allTeams.teams;
    state.teams.balanced = balancedTeams.teams;
    deriveHeroes();
    renderSummary();
    update();
  } catch (error) {
    elements.statusMessage.textContent = error.message;
    elements.resultsTitle.textContent = "Unable to load data";
  }
}

init();

