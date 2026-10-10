import type {
  DataProvider,
  Hero,
  Patch,
  PatchData,
  PatchManifest,
  Team,
  TeamUpEffect,
  MapsData,
  EventModesData,
  Update,
} from "../types/data";

function runtimeDataBase(): string {
  if (import.meta.env.VITE_DATA_BASE_URL) return import.meta.env.VITE_DATA_BASE_URL.replace(/\/$/, "");
  const segments = window.location.pathname.split("/").filter(Boolean);
  const reactIndex = segments.indexOf("react");
  if (reactIndex >= 0) return import.meta.env.DEV ? "/data" : `/${segments.slice(0, reactIndex + 1).join("/")}/data`;
  const pathname = window.location.pathname === "/" ? "" : window.location.pathname.replace(/\/$/, "");
  return `${pathname}/data`;
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${runtimeDataBase()}/${path}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to load ${path} (${response.status})`);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("json")) throw new Error(`Expected JSON for ${path}, but the server returned ${contentType || "HTML"}. Check the deployed base path.`);
  return response.json() as Promise<T>;
}

function patchPath(patch: Patch, filename: string): string {
  return `${patch.data_path.replace(/^data\//, "")}/${filename}`;
}

export const staticDataProvider: DataProvider = {
  getManifest: () => getJson<PatchManifest>("patches.json"),
  async getPatchData(patch) {
    const [summary, heroes, teamups, effects, heroDetails, all, balanced, oneThreeTwo, twoOneThree, oneTwoThree, threeOneTwo, maps, eventModes, updates] = await Promise.all([
      getJson<PatchData["summary"]>(patchPath(patch, "summary.json")),
      getJson<{ heroes: Hero[] }>(patchPath(patch, "heroes.json")),
      getJson<{ teamups: Record<string, string[]> }>(patchPath(patch, "teamups.json")),
      getJson<{ effects: Record<string, TeamUpEffect[]> }>(patchPath(patch, "teamup_effects.json")),
      getJson<{ heroes?: Record<string, PatchData["heroDetails"][string]> }>(patchPath(patch, "hero_details.json")),
      getJson<{ teams: Team[] }>(patchPath(patch, "all_fully_enhanced_teams.json")),
      getJson<{ teams: Team[] }>(patchPath(patch, "fully_enhanced_222_teams.json")),
      getJson<{ teams: Team[] }>(patchPath(patch, "fully_enhanced_132_teams.json")),
      getJson<{ teams: Team[] }>(patchPath(patch, "fully_enhanced_213_teams.json")),
      getJson<{ teams: Team[] }>(patchPath(patch, "fully_enhanced_123_teams.json")),
      getJson<{ teams: Team[] }>(patchPath(patch, "fully_enhanced_312_teams.json")),
      getJson<MapsData>("maps.json"),
      getJson<EventModesData>("event_modes.json"),
      getJson<{ updates: Update[] }>("updates.json"),
    ]);
    return {
      summary,
      heroes: heroes.heroes,
      teamups: teamups.teamups,
      teamupEffects: effects.effects,
      heroDetails: heroDetails.heroes || {},
      maps,
      eventModes,
      updates: updates.updates || [],
      teams: {
        all: all.teams,
        "222": balanced.teams,
        "132": oneThreeTwo.teams,
        "213": twoOneThree.teams,
        "123": oneTwoThree.teams,
        "312": threeOneTwo.teams,
      },
    };
  },
};
