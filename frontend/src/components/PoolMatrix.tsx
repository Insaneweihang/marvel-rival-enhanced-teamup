import type { CSSProperties } from "react";
import type { Team } from "../types/data";

type PairStats = { firstEnhanced: boolean; secondEnhanced: boolean; label: string; score: number; completionCount: number; bestTeam: Team | null };

function pairStats(firstHero: string, secondHero: string, teamups: Record<string, string[]>, teams: Team[]): PairStats {
  const firstEnhanced = (teamups[firstHero] || []).includes(secondHero);
  const secondEnhanced = (teamups[secondHero] || []).includes(firstHero);
  const completions = teams.filter((team) => team.heroes.some((hero) => hero.name === firstHero) && team.heroes.some((hero) => hero.name === secondHero));
  if (firstEnhanced && secondEnhanced) return { firstEnhanced, secondEnhanced, label: "Mutual", score: 3, completionCount: completions.length, bestTeam: completions[0] || null };
  if (firstEnhanced) return { firstEnhanced, secondEnhanced, label: "Enhances Player 1", score: 2, completionCount: completions.length, bestTeam: completions[0] || null };
  if (secondEnhanced) return { firstEnhanced, secondEnhanced, label: "Enhances Player 2", score: 2, completionCount: completions.length, bestTeam: completions[0] || null };
  return { firstEnhanced, secondEnhanced, label: "No direct link", score: 0, completionCount: completions.length, bestTeam: completions[0] || null };
}

export function PoolMatrix({ firstHeroes, secondHeroes, teamups, teams, onSelectPair }: { firstHeroes: string[]; secondHeroes: string[]; teamups: Record<string, string[]>; teams: Team[]; onSelectPair: (firstHero: string, secondHero: string) => void }) {
  if (!firstHeroes.length || !secondHeroes.length) return <div className="matrix-empty">Matrix appears after both pools have heroes.</div>;
  return <div className="pool-matrix-scroll"><div className="pool-matrix-table" style={{ "--pool-columns": secondHeroes.length + 1 } as CSSProperties}><span className="matrix-corner">P1 / P2</span>{secondHeroes.map((hero) => <strong className="matrix-header" key={hero}>{hero}</strong>)}{firstHeroes.map((firstHero) => <div className="matrix-row" key={firstHero}><strong className="matrix-header">{firstHero}</strong>{secondHeroes.map((secondHero) => { const stats = pairStats(firstHero, secondHero, teamups, teams); return <button type="button" key={`${firstHero}-${secondHero}`} className={`pool-matrix-cell score-${stats.score}`} title={`${stats.label}; ${stats.completionCount} valid teams`} onClick={() => onSelectPair(firstHero, secondHero)}><span>{stats.label}</span><small>{stats.completionCount} teams</small><em>{stats.bestTeam ? `Best: ${stats.bestTeam.heroes.map((hero) => hero.name).join(", ")}` : "No full comp"}</em></button>; })}</div>)}</div></div>;
}
