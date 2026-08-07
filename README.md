# NYCE TV — Full Website

A real, working news website for NYCE TV: a Node/Express + PostgreSQL API (`/backend`)
and a React + Vite frontend (`/frontend`) that talks to it. This is the production
follow-up to the in-browser prototype — same design and features, now backed by a real
database and real authentication instead of a demo password.

## Quick start (local)

You need Node 18+ and PostgreSQL running locally.

```bash
# 1. Backend
cd backend
npm install
createdb nyce_tv
cp .env.example .env        # then edit: DATABASE_URL, JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD
npm run migrate
npm run seed                # creates your admin login + starter content
npm start                   # → http://localhost:4000

# 2. Frontend (new terminal)
cd frontend
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:4000/api is the default, fine for local
npm run dev                 # → http://localhost:5173
```

Open the frontend URL, browse the site, then log into `/` → hamburger menu → Admin
Access using the username/password you set in `ADMIN_USERNAME`/`ADMIN_PASSWORD` before
seeding.

## What changed from the prototype

- **Real database.** Everything (articles, categories, live posts, team, comments,
  contact/donate info, settings) lives in PostgreSQL, not browser storage.
- **Real authentication.** Username + password, hashed with bcrypt, JWT-based sessions —
  not a shared demo password.
- **Real file uploads.** Images and voice comments upload to the server (`/backend/uploads`
  locally; point this at object storage before you go live — see `backend/README.md`).
- **Server-side profanity filtering.** Can't be bypassed by calling the API directly,
  unlike a client-only check.

Both pieces were tested for real while building this: the backend against a live Postgres
instance (full CRUD, auth, threaded comments, file uploads, validation, cascading deletes),
and the frontend with a genuine `vite build` (1786 modules, zero errors).

## Deploying for real

See `backend/README.md` for the full walkthrough (hosting options, environment
variables, a security checklist). Short version:

1. **Database** — a free Postgres from [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Railway](https://railway.app).
2. **Backend** — deploy the `/backend` folder to [Render](https://render.com) or [Railway](https://railway.app) from a GitHub repo.
3. **Frontend** — `npm run build` produces static files in `frontend/dist`; deploy those to [Vercel](https://vercel.com), [Netlify](https://netlify.com), or Cloudflare Pages. Set `VITE_API_URL` to your backend's real URL as a build-time environment variable on whichever host you pick.
4. **Domain** — buy it anywhere (Namecheap, GoDaddy, etc.), point it at your frontend host, and point a subdomain (e.g. `api.yourdomain.com`) at your backend host.

None of this requires anything shady — just accounts with legitimate hosts, which I can
walk you through step by step when you're ready.

## Still open (see `backend/README.md` §3 for detail)

- Object storage for uploads (local disk isn't durable on most hosts)
- A real moderation library/API in place of the sample profanity word list
- Email for the contact form
- Payment integration if you want real online donations (Paystack/Flutterwave are common for Ghana-based sites)
