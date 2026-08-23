# Creator Feed Worker

This Worker exposes the latest three videos from the creator's public YouTube RSS feed as JSON for the React hub.

## Configure

Copy `wrangler.example.toml` to `wrangler.toml` and set `YOUTUBE_CHANNEL_ID`. Do not put a private API key in the frontend or repository.

## Deploy

```bash
npx wrangler deploy
```

The React app uses the deployed Worker URL directly:

```text
https://insaneweihang-creator-feed.insaneweihang.workers.dev/creator-feed
```

A branded custom route such as `https://api.insaneweihang.com/creator-feed`
can be configured later. Before the Worker is deployed, the hub shows its
committed fallback video card.
