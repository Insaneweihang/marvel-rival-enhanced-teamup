import { useEffect, useState } from "react";

type FeaturedVideo = {
  id: string;
  title: string;
  publishedAt?: string;
  thumbnailUrl: string;
  href: string;
};

const FEED_URL = import.meta.env.VITE_CREATOR_FEED_URL || "https://insaneweihang-creator-feed.insaneweihang.workers.dev/creator-feed";
const FALLBACK_VIDEOS: FeaturedVideo[] = [
  {
    id: "iR7ZhJwH6kg",
    title: "Season 9.5 Tier List - Best vs Worst",
    thumbnailUrl: "https://i.ytimg.com/vi/iR7ZhJwH6kg/hqdefault.jpg",
    href: "https://www.youtube.com/watch?v=iR7ZhJwH6kg",
  },
];

const CREATOR_LINKS = [
  ["youtube", "YouTube", "https://www.youtube.com/@insaneweihang"],
  ["instagram", "Instagram", "https://instagram.com/insaneweihang"],
  ["discord", "Discord", "https://discord.gg/82V8xT8qRx"],
  ["linktree", "Linktree", "https://linktr.ee/insaneweihang"],
  ["kofi", "Ko-fi", "https://ko-fi.com/insaneweihang"],
] as const;

function track(event: string, params: Record<string, unknown> = {}) {
  window.gtag?.("event", event, params);
}

function CreatorLink({ icon, label, href }: { icon: string; label: string; href: string }) {
  return <a className="creator-link" href={href} target="_blank" rel="noreferrer" onClick={() => track("creator_social_clicked", { destination: icon, source_view: "creator_hub" })}>
    <img src={`https://cdn.simpleicons.org/${icon}`} alt="" />
    <span>{label}</span>
  </a>;
}

export function CreatorHub({ rootPath }: { rootPath: string }) {
  const [videos, setVideos] = useState<FeaturedVideo[]>(FALLBACK_VIDEOS);

  useEffect(() => {
    fetch(FEED_URL, { headers: { Accept: "application/json" } })
      .then((response) => response.ok ? response.json() as Promise<{ videos?: FeaturedVideo[] }> : Promise.reject(new Error("Feed unavailable")))
      .then((payload) => { if (payload.videos?.length) setVideos(payload.videos.slice(0, 3)); })
      .catch(() => undefined);
  }, []);

  useEffect(() => { track("creator_hub_viewed"); }, []);

  return <div className="creator-shell">
    <header className="creator-header">
      <a className="creator-wordmark" href={`${rootPath}/`} aria-label="InsaneWeihang creator hub"><img src={`${rootPath}/assets/insaneweihang-logo.svg`} alt="InsaneWeihang" /></a>
      <nav aria-label="Creator navigation">
        <a className="creator-nav-active" href={`${rootPath}/`}>Creator</a>
        <a href={`${rootPath}/marvel-rivals/`} onClick={() => track("tool_opened", { tool: "marvel-rivals-teamup-planner", source_view: "creator_hub" })}>Marvel Rivals</a>
        <a href={`${rootPath}/tools/`}>More tools</a>
      </nav>
    </header>
    <main className="creator-main">
      <section className="creator-intro">
        <div>
          <p className="eyebrow">InsaneWeihang</p>
          <h1>Marvel Rivals ideas, tools, and videos.</h1>
          <p className="creator-lede">Follow the creator, find the community, and use the tools built for players who want to understand the game better.</p>
          <div className="creator-actions">
            <a className="creator-primary-action" href="https://www.youtube.com/@insaneweihang" target="_blank" rel="noreferrer" onClick={() => track("creator_video_clicked", { destination: "youtube", source_view: "creator_hub", placement: "hero" })}>Watch on YouTube</a>
            <a className="creator-secondary-action" href={`${rootPath}/marvel-rivals/`} onClick={() => track("tool_opened", { tool: "marvel-rivals-teamup-planner", source_view: "creator_hub", placement: "hero" })}>Open the Team-Up Planner</a>
          </div>
        </div>
        <aside className="creator-profile-card">
          <span className="creator-avatar">WH</span>
          <strong>InsaneWeihang</strong>
          <span>Marvel Rivals content creator</span>
          <div className="creator-link-grid">{CREATOR_LINKS.map(([icon, label, href]) => <CreatorLink key={icon} icon={icon} label={label} href={href} />)}</div>
        </aside>
      </section>
      <section className="creator-section">
        <div className="creator-section-heading"><div><p className="eyebrow">Latest content</p><h2>Watch what is being tested</h2></div><a href="https://www.youtube.com/@insaneweihang" target="_blank" rel="noreferrer" onClick={() => track("creator_video_clicked", { destination: "youtube", source_view: "creator_hub", placement: "latest_heading" })}>View channel</a></div>
        <div className="video-grid">{videos.map((video) => <a className="video-card" href={video.href} target="_blank" rel="noreferrer" key={video.id} onClick={() => track("creator_video_clicked", { destination: "youtube", video_id: video.id, source_view: "creator_hub", placement: "latest_content" })}><img src={video.thumbnailUrl} alt="" /><div><strong>{video.title}</strong>{video.publishedAt && <small>{new Date(video.publishedAt).toLocaleDateString()}</small>}</div></a>)}</div>
      </section>
      <section className="creator-tool-callout"><div><p className="eyebrow">Built for Marvel Rivals</p><h2>Plan a fully enhanced team before you queue.</h2><p>Browse every valid composition, draft around missing partners, compare duo pools, and share the result.</p></div><a className="creator-primary-action" href={`${rootPath}/marvel-rivals/`} onClick={() => track("tool_opened", { tool: "marvel-rivals-teamup-planner", source_view: "creator_hub", placement: "tool_callout" })}>Use the planner</a></section>
    </main>
    <footer className="creator-footer"><span>InsaneWeihang</span><span>Marvel Rivals tools and content</span></footer>
  </div>;
}

export function ToolsHub({ rootPath }: { rootPath: string }) {
  return <div className="creator-shell"><header className="creator-header"><a className="creator-wordmark" href={`${rootPath}/`} aria-label="InsaneWeihang creator hub"><img src={`${rootPath}/assets/insaneweihang-logo.svg`} alt="InsaneWeihang" /></a><nav aria-label="Creator navigation"><a href={`${rootPath}/`}>Creator</a><a href={`${rootPath}/marvel-rivals/`}>Marvel Rivals</a><a className="creator-nav-active" href={`${rootPath}/tools/`}>More tools</a></nav></header><main className="creator-main"><section className="tools-intro"><p className="eyebrow">InsaneWeihang tools</p><h1>Small utilities for Marvel Rivals players.</h1><p>More tools will live here as they are ready. Start with the Team-Up Planner.</p></section><section className="tool-directory"><a className="tool-directory-card" href={`${rootPath}/marvel-rivals/`}><span className="tool-icon">TU</span><div><strong>Marvel Rivals Team-Up Planner</strong><p>Browse compositions, build a team, compare duo pools, and explore maps.</p></div><span aria-hidden="true">-&gt;</span></a></section></main><footer className="creator-footer"><span>InsaneWeihang</span><a href={`${rootPath}/`}>Back to creator hub</a></footer></div>;
}
