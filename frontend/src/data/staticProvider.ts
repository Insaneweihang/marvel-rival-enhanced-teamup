import type {
  DataProvider,
  Hero,
  Patch,
  PatchData,
  PatchManifest,
  Team,
  TeamUpEffect,
  MapsData,
  Update,
} from "../types/data";

const DATA_BASE = (import.meta.env.VITE_DATA_BASE_URL || "./data").replace(/\/$/, "");

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${DATA_BASE}/${path}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to load ${path} (${response.status})`);
  return response.json() as Promise<T>;
}

function patchPath(patch: Patch, filename: string): string {
  return `${patch.data_path.replace(/^data\//, "")}/${filename}`;
}

export const staticDataProvider: DataProvider = {
  getManifest: () => getJson<PatchManifest>("patches.json"),
  async getPatchData(patch) {
    const [summary, heroes, teamups, effects, heroDetails, all, balanced, oneThreeTwo, twoOneThree, oneTwoThree, threeOneTwo, maps, updates] = await Promise.all([
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
      getJson<{ updates: Update[] }>("updates.json"),
    ]);
    return {
      summary,
      heroes: heroes.heroes,
      teamups: teamups.teamups,
      teamupEffects: effects.effects,
      heroDetails: heroDetails.heroes || {},
      maps,
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
