# Deploying ExFlow

ExFlow is now a split architecture: a Next.js frontend (Vercel) and a separate
Express API backend (Render, Railway, Fly, or any Node host), sharing a Neon
Postgres database. The frontend never talks to Postgres directly — every
request goes through the backend's `/api/*` routes over HTTPS with a JWT.

## 1. Push the code to GitHub

```bash
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin master
```

## 2. Create the Neon database

1. Go to [neon.tech](https://neon.tech) and create a project.
2. From the project dashboard's **Connect** panel, copy the **pooled**
   connection string (has `-pooler` in the hostname) for `DATABASE_URL`, and
   toggle pooling off to get the **direct** string for `DIRECT_URL`.

## 3. Deploy the backend (`backend/`)

Any Node host works — these steps assume Render, but the env vars are the
same everywhere.

1. Create a new Web Service pointed at this repo, **root directory
   `backend`**.
2. Build command: `npm install && npm run build`. Start command:
   `npx prisma migrate deploy && npm start`.
3. Set these environment variables:

   | Variable | Where to find it |
   |---|---|
   | `DATABASE_URL` | Neon pooled connection string (step 2). |
   | `DIRECT_URL` | Neon direct connection string (step 2). |
   | `JWT_SECRET` | Generate with `openssl rand -base64 32`. |
   | `JWT_EXPIRES_IN` | e.g. `7d`. |
   | `PORT` | Your host usually sets this for you; otherwise `4000`. |
   | `CORS_ORIGIN` | Your Vercel frontend URL, e.g. `https://your-app.vercel.app`. |
   | `RESEND_API_KEY` | resend.com → API Keys. Without it, invite/reset emails just log to the server console instead of sending. |
   | `RESEND_FROM_EMAIL` | e.g. `ExFlow <onboarding@resend.dev>`, or your own verified sending domain in Resend. |
   | `S3_ENDPOINT` | Leave unset for real AWS S3. Set to your provider's endpoint for anything else (Cloudflare R2, Backblaze B2). |
   | `S3_REGION` | Your bucket's region (`auto` is fine for R2). |
   | `S3_BUCKET` | Your bucket name. |
   | `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | From your storage provider. |

4. Deploy. Note the resulting backend URL (e.g. `https://exflow-api.onrender.com`) —
   you'll need it for the frontend.

A `backend/Dockerfile` is included if your host deploys from a container
instead of a buildpack.

## 4. Deploy the frontend to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import the GitHub repo
   (root directory: repo root, not `backend`).
2. Vercel auto-detects Next.js — leave build settings as default.
3. Set environment variables:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | Your deployed backend URL from step 3, e.g. `https://exflow-api.onrender.com`. |
   | `NEXT_PUBLIC_APP_URL` | Your Vercel URL, e.g. `https://your-app.vercel.app`. |

   The frontend has no database credentials and needs none — everything
   goes through `NEXT_PUBLIC_API_URL`.
4. Deploy.

## 5. Seed sample data (optional)

From `backend/`, with `.env` pointed at the production `DATABASE_URL`:

```bash
npx prisma db seed
```

This seeds into whichever organization already exists — sign up for a real
workspace first at `https://your-app.vercel.app/signup`.

## After deploying

- Make sure your S3-compatible bucket actually exists and its credentials are
  correct before relying on document uploads/downloads or PDF generation in
  production.
- Every push to `master` redeploys both the frontend (Vercel) and backend
  (if your host has auto-deploy enabled) independently.
