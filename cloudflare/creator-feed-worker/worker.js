const CACHE_TTL_SECONDS = 900;

function decodeXml(value) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function tag(entry, name) {
  const match = entry.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return match ? decodeXml(match[1].trim()) : "";
}

function parseFeed(xml) {
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0, 3).map((match) => {
    const entry = match[1];
    const id = tag(entry, "yt:videoId");
    const title = tag(entry, "title");
    const publishedAt = tag(entry, "published");
    return {
      id,
      title,
      publishedAt,
      thumbnailUrl: `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`,
      href: `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`,
    };
  }).filter((video) => video.id && video.title);
}

function response(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}`,
      ...extraHeaders,
    },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" } });
    if (request.method !== "GET" || url.pathname !== "/creator-feed") return response({ error: "Not found" }, 404);
    if (!env.YOUTUBE_CHANNEL_ID) return response({ error: "Feed is not configured" }, 503);

    const cache = caches.default;
    const cacheKey = new Request(`${url.origin}/creator-feed`, request);
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    try {
      const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(env.YOUTUBE_CHANNEL_ID)}`;
      const feedResponse = await fetch(feedUrl, { headers: { Accept: "application/atom+xml, application/xml" } });
      if (!feedResponse.ok) return response({ error: "Unable to load creator feed" }, 502);
      const videos = parseFeed(await feedResponse.text());
      const result = response({ videos });
      ctx.waitUntil(cache.put(cacheKey, result.clone()));
      return result;
    } catch {
      return response({ error: "Unable to load creator feed" }, 502);
    }
  },
};
