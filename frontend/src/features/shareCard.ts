import type { TeamHero } from "../types/data";

export type ShareCardPayload = {
  teamNumber?: number;
  mode: string;
  patchVersion: string;
  heroes: TeamHero[];
  activeEffects: Array<{ heroName: string; partnerName: string; abilityName?: string | null }>;
};

const roleColors: Record<string, string> = { Vanguard: "#b92035", Duelist: "#b77b1b", Strategist: "#16734b" };

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y); ctx.lineTo(x + width - radius, y); ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius); ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height); ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius); ctx.quadraticCurveTo(x, y, x + radius, y); ctx.closePath();
}

function wrappedText(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const words = value.split(/\s+/); const lines: string[] = []; let line = "";
  for (const word of words) { const next = line ? `${line} ${word}` : word; if (ctx.measureText(next).width <= maxWidth) line = next; else { if (line) lines.push(line); line = word; if (lines.length === maxLines - 1) break; } }
  if (line && lines.length < maxLines) lines.push(line);
  lines.forEach((item, index) => ctx.fillText(item, x, y + index * lineHeight));
}

export function drawShareCard(canvas: HTMLCanvasElement, payload: ShareCardPayload) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable.");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f5f7f4"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#19201d"; ctx.fillRect(0, 0, canvas.width, 112);
  ctx.fillStyle = "#fff"; ctx.font = "900 38px Arial, sans-serif"; ctx.fillText(payload.teamNumber ? `Team #${payload.teamNumber}` : "Fully Enhanced Team", 54, 60);
  ctx.fillStyle = "#cbd8ce"; ctx.font = "800 22px Arial, sans-serif"; ctx.fillText(payload.mode, 54, 92);
  ctx.textAlign = "right"; ctx.fillStyle = "#fff"; ctx.font = "900 24px Arial, sans-serif"; ctx.fillText("Marvel Rivals Team-Up Planner", 1146, 58); ctx.fillStyle = "#cbd8ce"; ctx.font = "800 18px Arial, sans-serif"; ctx.fillText("insaneweihang.com", 1146, 88); ctx.textAlign = "left";
  payload.heroes.forEach((hero, index) => { const x = 54 + (index % 3) * 374; const y = 148 + Math.floor(index / 3) * 116; ctx.fillStyle = "#fff"; roundedRect(ctx, x, y, 342, 84, 12); ctx.fill(); ctx.fillStyle = roleColors[hero.primary_role || hero.role] || "#68736e"; roundedRect(ctx, x, y, 10, 84, 8); ctx.fill(); ctx.fillStyle = "#19201d"; ctx.font = "900 25px Arial, sans-serif"; ctx.fillText(hero.name, x + 26, y + 37); ctx.fillStyle = "#68736e"; ctx.font = "800 16px Arial, sans-serif"; ctx.fillText(hero.primary_role || hero.role, x + 26, y + 63); });
  ctx.fillStyle = "#19201d"; ctx.font = "900 24px Arial, sans-serif"; ctx.fillText("Active Team-Ups", 54, 414); ctx.fillStyle = "#344139"; ctx.font = "800 18px Arial, sans-serif";
  payload.activeEffects.slice(0, 6).forEach((effect, index) => wrappedText(ctx, `${effect.heroName} <- ${effect.partnerName}: ${effect.abilityName || "Team-Up effect"}`, 54, 450 + index * 26, 1080, 22, 1));
  ctx.fillStyle = "#68746c"; ctx.font = "800 17px Arial, sans-serif"; ctx.fillText(`Patch ${payload.patchVersion}`, 54, 632); ctx.textAlign = "right"; ctx.fillText("Fully enhanced team card", 1146, 632); ctx.textAlign = "left";
}

export function canvasToBlob(canvas: HTMLCanvasElement) { return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png")); }

export function shareText(payload: ShareCardPayload) { return `Marvel Rivals Team-Up Planner\n${payload.teamNumber ? `Team #${payload.teamNumber}` : "Fully Enhanced Team"}\n${payload.heroes.map((hero) => hero.name).join(" / ")}\nPatch: ${payload.patchVersion}`; }
