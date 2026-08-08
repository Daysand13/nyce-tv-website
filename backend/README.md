# NYCE 90.7 FM — Backend API

A Node.js/Express + PostgreSQL API for the NYCE 90.7 FM news site: categories, articles, live posts,
team, research links, contact/socials, donate info, site settings, and threaded text/voice
comments with server-side profanity filtering. Real JWT auth, not a demo password.

This has been run end-to-end against a live PostgreSQL database during development — every
endpoint below was hit with real requests, not just written and assumed to work.

## 1. Local setup

**Requirements:** Node 18+, a PostgreSQL database (local, or a free-tier hosted one — see §3).

```bash
npm install
cp .env.example .env        # then fill in the values, see below
npm run migrate             # creates all tables
npm run seed                # creates your admin login + starter content
npm start                   # runs on http://localhost:4000
```

### Environment variables (`.env`)

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | `postgres://user:pass@host:5432/dbname`. Hosted providers give you this directly. |
| `PGSSL` | No | Set to `false` for a local Postgres with no SSL. Defaults to on. |
| `JWT_SECRET` | Yes | Any long random string. Generate one: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `ADMIN_USERNAME` | Only for seeding | Defaults to `admin`. |
| `ADMIN_PASSWORD` | Only for seeding | Required the first time you run `npm run seed` — this becomes the real login. |
| `PORT` | No | Defaults to `4000`. |
| `FRONTEND_ORIGIN` | Recommended | Comma-separated list of allowed origins for CORS. Use `*` only while testing. |
| `UPLOAD_DIR` | No | Local-disk fallback path, only used when R2 (below) isn't configured. |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` | Recommended | All five together activate Cloudflare R2 for uploads. See the storage note in §4. |

`npm run seed` is safe to re-run — it only creates things that don't already exist, so it won't duplicate content or reset an admin that's already there.

## 2. API reference

All responses are JSON. Protected routes need `Authorization: Bearer <token>` from `/api/auth/login`.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | — | `{username, password}` → `{token, admin}` |
| GET | `/api/auth/me` | admin | Confirm the current token |
| POST | `/api/auth/change-password` | admin | `{currentPassword, newPassword}` |
| GET | `/api/categories` | — | List all |
| POST/PUT/DELETE | `/api/categories[/:id]` | admin | `{name, isLive}` |
| GET | `/api/articles?categoryId=` | — | List (optionally filtered) |
| GET | `/api/articles/:id` | — | Single article |
| POST/PUT/DELETE | `/api/articles[/:id]` | admin | `{categoryId, title, excerpt, body, imageUrl, videoUrl, youtubeUrl, author, featured}` |
| GET | `/api/live` | — | List, live-status posts sorted first |
| POST/PUT/DELETE | `/api/live[/:id]` | admin | `{categoryId, title, description, mediaType, mediaUrl, status}` |
| GET | `/api/team` | — | List |
| POST/PUT/DELETE | `/api/team[/:id]` | admin | `{name, role, photoUrl, bio}` |
| GET | `/api/research` | — | List |
| POST/PUT/DELETE | `/api/research[/:id]` | admin | `{label, url, description}` |
| GET | `/api/ads` | — | List (includes inactive — the frontend filters to `active` before displaying) |
| POST/PUT/DELETE | `/api/ads[/:id]` | admin | `{advertiser, imageUrl, linkUrl, active}` |
| GET/PUT | `/api/contact` | PUT: admin | `{address, phone, email, socials:{facebook,twitter,instagram,youtube,tiktok,whatsapp}}` |
| GET | `/api/donate` | — | `{intro, methods:[...]}` |
| PUT | `/api/donate/intro` | admin | `{intro}` |
| POST/PUT/DELETE | `/api/donate/methods[/:id]` | admin | `{label, detail}` |
| GET/PUT | `/api/settings` | PUT: admin | `{stationName, tagline, liveStreamUrl}` |
| GET | `/api/comments?targetType=&targetId=` | — | `targetType` is `article` or `live` |
| POST | `/api/comments` | — (rate-limited) | `{targetType, targetId, parentId, author, type, text, audioUrl}` |
| DELETE | `/api/comments/:id` | admin | Also deletes any threaded replies |
| POST | `/api/upload` | admin | `multipart/form-data`, field `file` → `{url}`. For article images, team photos, live media. |
| POST | `/api/upload/comment-audio` | — (rate-limited) | Same shape, audio only. Lets anonymous visitors post voice comments. |

The comment profanity filter runs server-side, so it can't be skipped by calling the API directly instead of using the site.

## 3. Deploying this for real

You'll need two pieces: a Postgres database, and somewhere to run this Node app. Good, low-effort
combinations that all have free or cheap tiers:

- **Render**: Postgres + Web Service in one place. Point the Web Service at this repo, set the
  env vars above, set the build command to `npm install` and start command to `npm start`.
- **Railway**: same idea — provision a Postgres plugin, deploy this repo, it reads `DATABASE_URL` automatically.
- **Fly.io**: works well if you want the app close to your users geographically; add a Postgres app alongside it.
- **A plain VPS** (DigitalOcean, Hetzner, etc.) if you want full control: install Postgres and Node,
  run this behind a process manager like `pm2`, and put Nginx or Caddy in front for HTTPS.

Whichever you pick, after deploying:
1. Run `npm run migrate` then `npm run seed` once, against the *production* database (most hosts let you run a one-off command, or you can point your local `.env` at the production `DATABASE_URL` temporarily).
2. Set `FRONTEND_ORIGIN` to your real frontend's URL once you know it — don't leave it as `*` in production.
3. Point your domain's DNS at whatever the host gives you (a CNAME or A record — your registrar and host both walk you through this).

## 4. Before this is a real production launch

This backend is solid and tested, but a few things are intentionally left as configuration
rather than being decided for you:

- **File storage — set this up before real launch.** Uploads use Cloudflare R2 automatically
  once configured; without it, they fall back to local disk, which most hosts wipe on every
  redeploy (this is why photos can vanish "after a while" on a host like Render). To turn on R2:
  1. In the Cloudflare dashboard, go to **R2 Object Storage** → you'll be asked to enable R2
     (requires a payment method on file, but normal image traffic for a site like this stays
     inside the free 10GB/month tier — R2's whole pitch is zero egress fees).
  2. **Create bucket** → give it a name (e.g. `nyce-uploads`).
  3. Open the bucket → **Settings** → **Public Access** → allow access via the `r2.dev`
     subdomain. Copy that public URL — it's your `R2_PUBLIC_URL`. (A custom domain like
     `media.yourdomain.com` works too and is nicer for production, but `r2.dev` is fine to start.)
  4. Back in the R2 Overview page, copy your **Account ID** — that's `R2_ACCOUNT_ID`.
  5. **Manage API Tokens** → **Create API Token** → give it Object Read & Write permission,
     scoped to your bucket → copy the **Access Key ID** and **Secret Access Key**.
  6. Set all five as environment variables on your backend host: `R2_ACCOUNT_ID`,
     `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`.
  Once all five are set, the server switches to R2 automatically on next deploy — nothing
  else to change. Leave them unset for local development; local disk is fine there.
- **Profanity filter**: the word list in `src/utils/profanity.js` is intentionally small and
  illustrative. Swap in a maintained package (e.g. `bad-words`, `leo-profanity`) or a cloud
  moderation API for real coverage.
- **Email**: the contact form isn't wired to send email yet — that needs a transactional email
  provider (Resend, Postmark, SendGrid) added to a new `/api/contact-form` route.
- **Payments/donations**: the Donate section stores whatever text you put in (MoMo number, bank
  details, etc.) — it doesn't process payments. If you want real online donations, that's a
  separate integration (Paystack and Flutterwave are common choices if the station is Ghana-based).
- **Backups**: turn on automatic backups on whichever Postgres host you choose — nearly all of them offer this as a checkbox.
