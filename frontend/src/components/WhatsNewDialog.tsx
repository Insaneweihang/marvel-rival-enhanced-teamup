import { useEffect, useRef } from "react";
import { WHATS_NEW_RECENT_DAYS, updateAgeInDays } from "../features/whatsNew";
import type { GameUpdate } from "../types/data";

type Props = {
  posts: GameUpdate[];
  onClose: () => void;
  onSeeAll: () => void;
};

const CATEGORY_LABELS: Record<string, string> = {
  patch: "Patch notes",
  balance: "Balance",
  dev: "Dev post",
  news: "News",
  video: "Video",
};

function subtitleFor(posts: GameUpdate[]) {
  const recent = posts.filter((item) => {
    const age = updateAgeInDays(item.date);
    return age !== null && age <= WHATS_NEW_RECENT_DAYS;
  });
  const patch = posts.find((item) => item.category === "patch" || item.category === "balance");
  const parts: string[] = [];
  if (recent.length) {
    parts.push(
      `${recent.length} post${recent.length === 1 ? "" : "s"} from the last ${WHATS_NEW_RECENT_DAYS} days`,
    );
  }
  if (patch && !recent.includes(patch)) {
    parts.push(`the newest patch notes (${patch.date})`);
  }
  return parts.length ? `Official posts: ${parts.join(" plus ")}.` : "Newest official posts.";
}

export function WhatsNewDialog({ posts, onClose, onSeeAll }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="whats-new-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="whats-new-title"
      aria-describedby="whats-new-subtitle"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="whats-new-card">
        <div className="whats-new-heading">
          <div>
            <p className="eyebrow">What's new</p>
            <h2 id="whats-new-title">Fresh Marvel Rivals updates</h2>
            <p id="whats-new-subtitle" className="whats-new-subtitle">
              {subtitleFor(posts)}
            </p>
          </div>
          <button ref={closeRef} type="button" aria-label="Close what's new" title="Close" onClick={onClose}>
            x
          </button>
        </div>
        <ul className="whats-new-list">
          {posts.map((item) => (
            <li className="game-update-item" key={item.id || `${item.date}-${item.title}`}>
              <div className="game-update-meta">
                <span className={`game-update-badge ${item.category}`}>
                  {CATEGORY_LABELS[item.category] || "News"}
                </span>
                {item.source_label && (
                  <span className={`game-update-from ${item.source || "official"}`}>{item.source_label}</span>
                )}
                <span className="game-update-date">{item.date}</span>
              </div>
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                {item.title}
              </a>
            </li>
          ))}
        </ul>
        <div className="whats-new-actions">
          <button className="primary-action" type="button" onClick={onSeeAll}>
            See all game updates
          </button>
          <button type="button" onClick={onClose}>
            Dismiss
          </button>
        </div>
        <p className="whats-new-foot">Official post dates. Unofficial fan project.</p>
      </div>
    </div>
  );
}
