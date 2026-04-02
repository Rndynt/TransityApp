# TransityApp (transityweb)

Aplikasi web B2C untuk pelanggan Transity — memungkinkan pengguna mencari jadwal, memilih kursi, dan memesan tiket bus.

## Stack

- **Frontend**: React 18 + Vite + TailwindCSS
- **Backend/Server**: Fastify (sebagai proxy ke TransityTerminal API)
- **Language**: TypeScript (ESM)

## Struktur

```
src/           # Frontend React (pages, components, lib)
server/        # Fastify server (API proxy + serve Vite dev)
public/        # Static assets
```

## Environment Variables

| Variable | Default | Keterangan |
|---|---|---|
| `PORT` | `5000` | Port server |
| `API_UPSTREAM` | `https://nusa-terminal.transity.web.id` | URL backend TransityTerminal |
| `NODE_ENV` | `development` | Mode aplikasi |

## Scripts

- `npm run dev` — Jalankan server development (tsx + vite)
- `npm run build` — Build frontend (vite) + server (tsc)
- `npm start` — Jalankan production build

## Catatan Arsitektur

Server Fastify bertindak sebagai **reverse proxy** — semua request ke `/api/*` diteruskan ke `API_UPSTREAM` (TransityTerminal). Frontend di-serve via Vite middleware (dev) atau static files (prod).

Project ini terpisah dari **TransityTerminal** (CSO/admin dashboard) yang ada di repo lain.
