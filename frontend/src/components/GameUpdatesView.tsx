import type { GameUpdate, GameUpdates, Patch } from "../types/data";

type Props = { gameUpdates: GameUpdates; patches: Patch[] };

const CATEGORY_LABELS: Record<string, string> = {
  patch: "Patch notes",
  balance: "Balance",
  dev: "Dev post",
  news: "News",
  video: "Video",
};

function categoryLabel(category: string) {
  return CATEGORY_LABELS[category] || "News";
}

export function GameUpdatesView({ gameUpdates, patches }: Props) {
  const items: GameUpdate[] = gameUpdates.items || [];
  const coveredDates = new Set(patches.map((patch) => patch.date));

  return (
    <section className="game-updates-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Official news feed</p>
          <h2>Game Updates</h2>
          <p>
            Newest patch notes, balance posts, dev diaries and videos from the official Marvel Rivals
            channels. Steam mirrors are folded into their official-site post.
            {gameUpdates.updated_at ? ` Last synced ${gameUpdates.updated_at}.` : ""}
          </p>
        </div>
      </div>

      {items.length ? (
        <ul className="game-update-list">
          {items.map((item) => (
            <li className="game-update-item" key={item.id}>
              <div className="game-update-meta">
                <span className={`game-update-badge ${item.category}`}>{categoryLabel(item.category)}</span>
                {item.source_label && (
                  <span className={`game-update-from ${item.source || "official"}`}>{item.source_label}</span>
                )}
                <span className="game-update-date">{item.date}</span>
                {coveredDates.has(item.date) && <span className="game-update-covered">in this dataset</span>}
              </div>
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                {item.title}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p>No updates loaded yet.</p>
      )}

      <p className="game-update-source">
        {gameUpdates.disclaimer || "Unofficial fan project."}{" "}
        {gameUpdates.source_url && (
          <a href={gameUpdates.source_url} target="_blank" rel="noopener noreferrer">
            Source: {gameUpdates.source || "official news"}
          </a>
        )}
      </p>
    </section>
  );
}
