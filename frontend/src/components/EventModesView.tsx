import { useMemo, useState } from "react";
import type { EventMode, Hero, PatchData } from "../types/data";

type Props = { data: PatchData; heroes: Hero[] };

function effectNames(data: PatchData, roster: string[]) {
  const selected = new Set(roster);
  return roster.flatMap((hero) => (data.teamups[hero] || []).filter((partner) => selected.has(partner)).map((partner) => `${hero} + ${partner}`));
}

function ruleLabel(mode: EventMode) {
  if (mode.duplicate_heroes === "allowed_secondary") return "Duplicate heroes: allowed (secondary source)";
  if (mode.duplicate_heroes === "verify") return "Duplicate heroes: verify";
  return "Duplicate heroes: not documented";
}

export function EventModesView({ data, heroes }: Props) {
  const [modeId, setModeId] = useState("18v18-annihilation");
  const [roster, setRoster] = useState<string[]>([]);
  const [squads, setSquads] = useState<string[][]>(() => Array.from({ length: 6 }, () => ["", ""]));
  const [search, setSearch] = useState("");
  const mode = data.eventModes.modes.find((item) => item.id === modeId) || data.eventModes.modes[0];
  if (!mode) return <section className="event-modes-panel"><p>No event mode data is available.</p></section>;
  const filteredHeroes = useMemo(() => heroes.filter((hero) => hero.name.toLowerCase().includes(search.toLowerCase())).slice(0, 24), [heroes, search]);
  const activeEffects = effectNames(data, mode.id === "18v18-annihilation" ? roster : squads.flat());

  function addRosterHero(name: string) {
    if (mode.id !== "18v18-annihilation" || roster.length >= (mode.team_size || 18)) return;
    setRoster((current) => [...current, name]);
  }

  function updateSquad(index: number, slot: number, name: string) {
    setSquads((current) => current.map((squad, squadIndex) => squadIndex === index ? squad.map((hero, heroIndex) => heroIndex === slot ? name : hero) : squad));
  }

  return <section className="event-modes-panel">
    <div className="section-heading"><div><p className="eyebrow">Event planning</p><h2>Event Modes</h2><p>Mode-specific planning for large rosters and duo squads. Draft rules are shown only when documented.</p></div><small>Checked {data.eventModes.last_checked || "Unknown"}</small></div>
    <div className="event-mode-tabs" role="tablist">{data.eventModes.modes.map((item) => <button key={item.id} type="button" className={item.id === mode.id ? "active" : ""} onClick={() => setModeId(item.id)}>{item.label}<small>{item.summary}</small></button>)}</div>
    <article className="event-mode-facts"><div><strong>{mode.team_size ? `${mode.team_size}-player team` : `${mode.players}-player event`}</strong><span>{mode.squad_count ? `${mode.squad_count} squads of ${mode.squad_size}` : `Squad size: ${mode.squad_size}`}</span></div><div><strong>{ruleLabel(mode)}</strong><span>{mode.draft_type === "none_documented" ? "Draft: no special draft documented" : "Draft: planning simulator only"}</span></div><div><strong>Maps</strong><span>{mode.maps?.join(", ") || "Event structure only"}</span></div></article>
    <div className="event-mode-notes">{mode.notes.map((note) => <p key={note}>{note}</p>)}</div>
    {mode.id === "18v18-annihilation" ? <>
      <div className="section-heading"><div><h3>18v18 roster</h3><p>{roster.length}/{mode.team_size} slots used. Repeated heroes are supported by the current secondary-source rule.</p></div><button type="button" onClick={() => setRoster([])}>Reset roster</button></div>
      <input type="search" aria-label="Search heroes for event roster" placeholder="Search heroes to add" value={search} onChange={(event) => setSearch(event.target.value)} />
      <div className="event-hero-picker">{filteredHeroes.map((hero) => <button type="button" key={hero.name} disabled={roster.length >= (mode.team_size || 18)} onClick={() => addRosterHero(hero.name)}>{hero.name}<small>{roster.filter((item) => item === hero.name).length ? `x${roster.filter((item) => item === hero.name).length}` : hero.role}</small></button>)}</div>
      <div className="event-roster">{roster.map((hero, index) => <button type="button" key={`${hero}-${index}`} onClick={() => setRoster((current) => current.filter((_, itemIndex) => itemIndex !== index))}>{hero} x</button>)}{!roster.length && <p>Add heroes to begin the roster.</p>}</div>
    </> : <>
      <div className="section-heading"><div><h3>Infinity War duo squads</h3><p>Assign two heroes to each of the six squads. This is a planning simulator, not an official pick/ban draft.</p></div><button type="button" onClick={() => setSquads(Array.from({ length: 6 }, () => ["", ""]))}>Reset squads</button></div>
      <div className="event-squads">{squads.map((squad, index) => <div className="event-squad" key={index}><strong>Squad {index + 1}</strong>{[0, 1].map((slot) => <select key={slot} aria-label={`Squad ${index + 1} hero ${slot + 1}`} value={squad[slot]} onChange={(event) => updateSquad(index, slot, event.target.value)}><option value="">Select hero</option>{heroes.map((hero) => <option key={hero.name} value={hero.name}>{hero.name}</option>)}</select>)}</div>)}</div>
    </>}
    <section className="event-effects"><h3>Directional Team-Up effects</h3>{activeEffects.length ? activeEffects.map((effect) => <span key={effect}>{effect}</span>) : <p>No active directional effects yet.</p>}</section>
  </section>;
}
