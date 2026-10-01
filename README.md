# AbhinayOsint API Hub v2

Production-oriented Vercel API gateway with:
- permanent upstream integration
- API keys
- per-key quotas
- expiry/status
- admin dashboard
- Upstash Redis persistence
- professional responsive UI
- raw upstream JSON passthrough

## 1. Create a Redis database

Create an Upstash Redis database and copy its REST URL/token.

## 2. Add Vercel environment variables

Required:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `ADMIN_TOKEN`

Optional:
- `UPSTREAM_API_BASE`
- `PUBLIC_API_NAME`
- `PUBLIC_DEVELOPER`
- `PUBLIC_YOUTUBE`

Keep secrets server-side. Vercel supports environment-scoped variables and secret visibility. Never prefix server secrets with a public/client prefix.

## 3. Deploy

Import the repository into Vercel, add the environment variables, and redeploy.

## 4. API usage

`GET /api/number?number=NUMBER&key=API_KEY`

or:

`X-API-Key: API_KEY`

or:

`Authorization: Bearer API_KEY`

Successful responses are returned as the upstream response body without wrapping, filtering, renaming or transforming the JSON.

## 5. Admin

Open the homepage and select Admin. The admin token is sent only to `/api/admin/*` over HTTPS.

### Important production note

The customer key is returned once at creation time and is stored server-side only as a SHA-256 lookup key. Do not put customer keys in GitHub or frontend source.

For high-volume traffic, add a dedicated distributed rate limiter in addition to quota enforcement.
