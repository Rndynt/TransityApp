# TransityApp (transityweb)

Aplikasi web B2C untuk pelanggan Transity — memungkinkan pengguna mencari jadwal, memilih kursi, dan memesan tiket bus. Merupakan bagian dari ekosistem Transity yang terdiri dari tiga komponen: **TransityApp** (aplikasi ini), **TransityConsole** (gateway & admin), dan **TransityTerminal** (backend per-operator).

## Stack

- **Frontend**: React 18 + Vite + TailwindCSS
- **Backend/Server**: Fastify (proxy ke TransityConsole gateway & TransityTerminal)
- **Language**: TypeScript (ESM)

## Struktur

```
src/           # Frontend React (pages, components, lib)
server/        # Fastify server (dual-upstream proxy + serve Vite dev)
public/        # Static assets
```

## Arsitektur Ekosistem

```
TransityApp (ini)
     │
     ├─ /api/gateway/* ──▶ TransityConsole (CONSOLE_URL)
     │                        └─▶ Operator A Terminal
     │                        └─▶ Operator B Terminal
     │
     └─ /api/app/*     ──▶ TransityTerminal langsung (API_UPSTREAM)
                           (untuk auth & booking list — sementara)
```

## Environment Variables

| Variable | Default | Keterangan |
|---|---|---|
| `PORT` | `5000` | Port server |
| `API_UPSTREAM` | `https://nusa-terminal.transity.web.id` | TransityTerminal langsung (auth, booking list) |
| `CONSOLE_URL` | _(kosong)_ | TransityConsole gateway (trips, seatmap, bookings baru) — fallback ke API_UPSTREAM jika kosong |
| `NODE_ENV` | `development` | Mode aplikasi |

## Scripts

- `npm run dev` — Jalankan server development (tsx + vite)
- `npm run build` — Build frontend (vite) + server (tsc)
- `npm start` — Jalankan production build

## Integrasi Gateway (ECOSYSTEM.md)

Berdasarkan [ECOSYSTEM.md](https://github.com/Rndynt/TransityConsole/blob/main/docs/ECOSYSTEM.md), TransityApp harus terhubung ke TransityConsole sebagai backend tunggal. Integrasi yang telah dilakukan:

### Endpoint yang sudah dimigrasi ke Gateway (`/api/gateway/*`):
- `GET /api/gateway/cities` — Daftar kota dari semua operator
- `GET /api/gateway/trips/search` — Pencarian perjalanan lintas operator
- `GET /api/gateway/trips/{tripId}` — Detail perjalanan (untuk stops)
- `GET /api/gateway/trips/{tripId}/seatmap` — Denah kursi
- `POST /api/gateway/bookings` — Buat pemesanan baru
- `GET /api/gateway/bookings/{bookingId}` — Detail pesanan (setelah booking via gateway)

### Endpoint yang tetap ke Terminal (`/api/app/*`):
- `POST /api/app/auth/register` / `login` / `GET /api/app/auth/me` — Auth penumpang
- `GET /api/app/bookings` — Daftar pesanan (My Trips)
- `POST /api/app/bookings/{id}/cancel` — Batalkan pesanan

### Perubahan data model:
- `TripSearchResult`: field `origin.stopName`, `origin.cityName`, `origin.departureTime` (bukan `name`, `city`, `departAt`)
- `TripSearchResult`: tambah `operatorSlug`, `operatorLogo`, `operatorColor`, `isVirtual`
- `CreateBookingData`: tambah field `serviceDate` (wajib)
- `GatewayBookingResponse`: menggunakan `bookingId` (bukan `id`)
- Virtual trips: tidak memiliki seatmap — UI menampilkan opsi lanjut tanpa pilih kursi

### Cara set CONSOLE_URL:
Tambahkan ke environment variables:
```
CONSOLE_URL=https://your-transity-console-domain.com
```
Jika `CONSOLE_URL` tidak diset, semua request (termasuk gateway) akan diteruskan ke `API_UPSTREAM`.
