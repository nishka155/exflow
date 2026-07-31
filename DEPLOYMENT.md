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
| `DATABASE_URL` | Render → your Postgres instance → Connections → the connection string. |
| `DIRECT_URL` | Same connection string — Render doesn't need a separate pooled/direct split the way Supabase's PgBouncer setup did. |
| `AUTH_SECRET` | Generate locally with `openssl rand -base64 32`. |
| `RESEND_API_KEY` | resend.com → API Keys. Required in production — without it, password-reset/invite emails just log to the server console instead of sending. |
| `RESEND_FROM_EMAIL` | e.g. `ExFlow <onboarding@resend.dev>`, or your own verified sending domain in Resend. |
| `S3_ENDPOINT` | Leave unset for real AWS S3. Set to your provider's endpoint for anything else (e.g. Cloudflare R2, Backblaze B2). |
| `S3_REGION` | Your bucket's region (`auto` is fine for R2). |
| `S3_BUCKET` | Your bucket name. |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | From your storage provider. |
| `NEXT_PUBLIC_APP_URL` | Your production URL, e.g. `https://your-app.vercel.app` (or custom domain once attached) |

## 4. Run migrations against the production database

From your local machine, with `.env` pointed at the **production** Render
database's `DATABASE_URL`/`DIRECT_URL`:

```bash
pnpm exec prisma migrate deploy
```

This applies the schema migrations to the production database — run once
before the first real signup. (Two older migrations,
`0002_auth_rls`/`0003_fix_new_user_trigger`, are Supabase-specific history
from before the Auth.js migration and are not part of what gets applied to a
fresh Render database — see the migration files' own comments.)

## 5. Deploy

Click **Deploy** in Vercel. Every push to `master` after this redeploys
automatically.

## After deploying

- Sign up for your real workspace at `https://your-app.vercel.app/signup`.
- Make sure your S3-compatible bucket actually exists and its credentials are
  correct before relying on document uploads/downloads or PDF generation in
  production — those will fail with the placeholder values in `.env.example`.
- If you want to seed sample data on the production database, point `.env`
  at production and run `pnpm exec prisma db seed` — same caveats as local:
  it seeds into whichever organization already exists.
