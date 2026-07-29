# Deploying ExFlow to Vercel

## 1. Push the code to GitHub

```bash
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin master
```

(Create the empty repo first at github.com/new — don't initialize it with a
README, since this project already has one.)

## 2. Import into Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import the GitHub repo.
2. Vercel auto-detects Next.js — leave the build settings as default
   (`pnpm build`, output directory auto-detected).
3. Before clicking Deploy, add the environment variables below.

## 3. Environment variables

Set these in the Vercel project's **Settings → Environment Variables**
(Production, and Preview if you want preview deploys to work too):

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API (publishable/anon key) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (secret/service role key) |
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection string → **Transaction pooler** (port 6543, `?pgbouncer=true`). **Use the pooler here, not the direct connection** — Vercel functions are serverless and will exhaust Postgres's connection limit against a direct connection. |
| `DIRECT_URL` | Same page → **Session/Direct** connection (port 5432). Only used for running migrations. |
| `NEXT_PUBLIC_APP_URL` | Your production URL, e.g. `https://your-app.vercel.app` (or custom domain once attached) |

## 4. Point Supabase Auth at your real domain

This step is easy to miss and breaks password-reset/invite emails in
production. In Supabase → **Authentication → URL Configuration**:

- **Site URL**: your production URL (`https://your-app.vercel.app`)
- **Redirect URLs**: add `https://your-app.vercel.app/auth/callback`

Without this, password reset and portal-invite emails will link back to
`localhost`.

## 5. Run migrations against the production database

From your local machine, with `.env` pointed at the **production** Supabase
project's `DATABASE_URL`/`DIRECT_URL`:

```bash
pnpm exec prisma migrate deploy
```

This applies `prisma/migrations/*` (schema + RLS policies + auth trigger) to
the production database. Do this once before the first real signup.

## 6. Deploy

Click **Deploy** in Vercel. Every push to `master` after this redeploys
automatically.

## After deploying

- Sign up for your real workspace at `https://your-app.vercel.app/signup`.
- The Supabase Storage bucket (`documents`) and RLS policies are already
  created by the migrations — no extra Supabase setup needed.
- If you want to seed sample data on the production database, point
  `.env` at production and run `pnpm exec prisma db seed` — same caveats
  as local: it seeds into whichever organization already exists.
