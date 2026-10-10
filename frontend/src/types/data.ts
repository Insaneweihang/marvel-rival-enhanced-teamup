export type Role = "Vanguard" | "Duelist" | "Strategist";

export type Patch = {
  id: string;
  label: string;
  date: string;
  data_path: string;
  available?: boolean;
};

export type PatchManifest = {
  default_patch: string;
  patches: Patch[];
};

export type Hero = {
  name: string;
  role: Role;
  roles?: Role[];
  active?: boolean;
};

export type HeroDetails = {
  display_name?: string;
  real_name?: string;
  role?: string;
  source_url?: string;
  abilities?: Array<{
    section?: string;
    name?: string;
    key?: string;
    description?: string;
    stats?: Record<string, string>;
  }>;
};

export type TeamHero = Hero & {
  primary_role?: Role;
  eligible_roles?: Role[];
  active_partners?: string[];
};

export type Team = {
  team_number: number;
  heroes: TeamHero[];
  role_format?: string;
};

export type TeamUpEffect = {
  partner: string;
  ability_name?: string | null;
  base_effect?: string | null;
  enhanced_effect?: string | null;
  enhanced_stats?: Record<string, string>;
  verification_status?: string;
};

export type PatchSummary = {
  patch_version: string;
  hero_count: number;
  fully_enhanced_unrestricted_count: number;
  fully_enhanced_222_count: number;
  role_distribution_counts: Record<string, number>;
  total_combinations_checked?: number;
};

export type MapRecord = {
  name: string;
  location?: string;
  objective_type?: string;
  category?: string;
  availability?: string[];
  modes?: string[];
  mode_rules?: Record<string, string[]>;
  release?: string;
};

export type MapsData = {
  last_checked?: string;
  sources?: Array<{ label: string; url: string }>;
  objective_types?: Array<{ name: string; summary: string }>;
  maps: MapRecord[];
};

export type EventMode = {
  id: string;
  label: string;
  summary: string;
  team_size?: number;
  players?: number;
  squad_count?: number;
  squad_size?: number;
  duplicate_heroes: "allowed_secondary" | "verify" | "not_documented";
  draft_type: "none_documented" | "planning_simulator";
  maps?: string[];
  notes: string[];
};

export type EventModesData = {
  last_checked?: string;
  sources?: Array<{ label: string; url: string; scope?: string }>;
  modes: EventMode[];
};

export type Update = {
  version: string;
  date: string;
  type: string;
  title: string;
  summary: string;
  note?: string;
};

export type PatchData = {
  summary: PatchSummary;
  heroes: Hero[];
  teamups: Record<string, string[]>;
  teamupEffects: Record<string, TeamUpEffect[]>;
  teams: Record<string, Team[]>;
  heroDetails: Record<string, HeroDetails>;
  maps: MapsData;
  eventModes: EventModesData;
  updates: Update[];
};

export type DataProvider = {
  getManifest(): Promise<PatchManifest>;
  getPatchData(patch: Patch): Promise<PatchData>;
};
