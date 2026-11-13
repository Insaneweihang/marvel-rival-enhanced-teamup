import type { GameUpdate } from "../types/data";

export const WHATS_NEW_STORAGE_KEY = "marvel-rivals:whats-new:v1";
/** Posts from this many days back count as "new" in the What's new popup. */
export const WHATS_NEW_RECENT_DAYS = 2;
/** The newest patch/balance post inside this window is always announced. */
export const WHATS_NEW_PATCH_DAYS = 7;

const DAY_MS = 86400000;

/** URL params that mean the visitor arrived at a specific team/view, not the landing page. */
export const DEEP_LINK_PARAMS = ["builder", "view", "include", "exclude", "detail", "pool1", "pool2"];

export function updateAgeInDays(dateString: string, today: Date = new Date()): number | null {
  if (!dateString) return null;
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((start.getTime() - date.getTime()) / DAY_MS);
}

/**
 * Recent official posts plus the newest patch notes.
 *
 * The popup is meant to announce "what changed in the last day or two". Patch notes
 * are the post players actually care about, so the newest patch/balance entry from
 * the last week is appended when it falls outside the 2-day window.
 */
export function whatsNewPosts(items: GameUpdate[] | undefined, today: Date = new Date()): GameUpdate[] {
  const recent: GameUpdate[] = [];
  let patchHighlight: GameUpdate | null = null;

  for (const item of items || []) {
    const age = updateAgeInDays(item.date, today);
    if (age === null || age < 0) continue;
    if (age <= WHATS_NEW_RECENT_DAYS) {
      recent.push(item);
      continue;
    }
    const isPatch = item.category === "patch" || item.category === "balance";
    if (isPatch && age <= WHATS_NEW_PATCH_DAYS && !patchHighlight) patchHighlight = item;
  }

  const posts = patchHighlight ? [...recent, patchHighlight] : recent;
  return posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

export function whatsNewSignature(posts: GameUpdate[]): string {
  return posts.map((item) => `${item.date}|${item.id || item.title}`).join(";");
}

export function readWhatsNewSeen(): string {
  try {
    return window.localStorage.getItem(WHATS_NEW_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function writeWhatsNewSeen(signature: string): void {
  try {
    window.localStorage.setItem(WHATS_NEW_STORAGE_KEY, signature);
  } catch {
    // Private-mode storage failures are non-fatal; the popup just reappears.
  }
}
