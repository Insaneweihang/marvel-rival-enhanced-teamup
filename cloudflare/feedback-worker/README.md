# Feedback Worker

Cloudflare Worker + D1 starter for the website feedback form.

## Setup

1. Create a D1 database in Cloudflare named `marvel-rivals-feedback`.
2. Copy `wrangler.example.toml` to `wrangler.toml`.
3. Replace `database_id` with the D1 database ID from Cloudflare.
4. Apply the schema:

```powershell
wrangler d1 execute marvel-rivals-feedback --file .\schema.sql
```

5. Deploy the Worker:

```powershell
wrangler deploy
```

6. Route `https://api.insaneweihang.com/feedback` to this Worker in Cloudflare.

## Notes

- Do not commit Cloudflare API tokens.
- The public website posts to `https://api.insaneweihang.com/feedback`.
- Feedback can be reviewed in the D1 dashboard or with `wrangler d1 execute`.
