# Abhinay API Hub — V1

## Stack
- Next.js
- Supabase Auth + Postgres
- Vercel

## Features
- Admin login
- Create APIs with random unique public IDs
- Server-side upstream URL
- Per-API request limits
- Usage counter
- Enable/disable
- Delete
- Configurable response transform
- `developer` can be set to `Abhinay`
- Selected top-level fields such as `youtube` can be removed
- Usage information can be added

## Setup

1. Create a Supabase project.
2. In Supabase SQL Editor, run `supabase/schema.sql`.
3. Create an admin user in Supabase Authentication.
4. Insert that user's UUID into `admin_users`:

```sql
insert into public.admin_users(user_id)
values ('YOUR_AUTH_USER_UUID');
```

5. Copy `.env.example` to `.env.local` and fill:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

6. Install and run:

```bash
npm install
npm run dev
```

7. Open `/admin/login`.

## Vercel
Import this repository into Vercel and add the same three environment variables in Project Settings.

## Upstream URL format

Use an authorized/test API that accepts a number placeholder, e.g.:

`https://example.com/api/lookup?number={number}`

The upstream URL stays server-side and is never returned by the public endpoint.

## Public endpoint

After creating an API, the endpoint is:

`/api/<route>/<public_id>?number=1234567890`

For a Vercel deployment:

`https://YOUR-DOMAIN.vercel.app/api/<route>/<public_id>?number=1234567890`

## Response transformation

The default transform is:

- set top-level `developer` to `Abhinay`
- remove top-level `youtube`
- add top-level request usage

Other response fields are copied without intentional modification.

## Important production notes

- Keep the Supabase service-role key server-side only.
- Add stronger rate limiting (Redis/Upstash or Vercel KV) before high-traffic production use; the V1 counter is database-based and is suitable for a small deployment.
- Only connect APIs and datasets you are authorized to expose.
