# TransityApp (transityweb)

Aplikasi web B2C untuk pelanggan Transity — memungkinkan pengguna mencari jadwal, memilih kursi, dan memesan tiket bus. Merupakan bagian dari ekosistem Transity yang terdiri dari tiga komponen: **TransityApp** (aplikasi ini), **TransityConsole** (gateway & admin), dan **TransityTerminal** (backend per-operator).

## Stack

- **Frontend**: React 18 + Vite + TailwindCSS
- **Backend/Server**: Fastify (proxy semua API ke TransityConsole gateway)
- **Language**: TypeScript (ESM)

## Struktur

```
src/           # Frontend React (pages, components, lib)
server/        # Fastify server (proxy ke Console + serve Vite dev)
public/        # Static assets
```

## Arsitektur Ekosistem

```
TransityApp (ini)
     │
     └─ /api/* ──▶ TransityConsole (CONSOLE_URL)
                       ├─ /api/gateway/* (trips, seatmap, bookings, materialize)
                       └─ /api/app/*     (auth, booking list — diteruskan Console ke Terminal)
```

Semua API request diarahkan ke Console. Tidak ada koneksi langsung ke Terminal.

## Environment Variables

| Variable | Default | Keterangan |
|---|---|---|
| `PORT` | `5000` | Port server |
| `CONSOLE_URL` | _(kosong)_ | TransityConsole gateway — semua API lewat sini |
| `API_UPSTREAM` | `https://nusa-terminal.transity.web.id` | Fallback jika CONSOLE_URL kosong |
| `NODE_ENV` | `development` | Mode aplikasi |

## Scripts

- `npm run dev` — Jalankan server development (tsx + vite)
- `npm run build` — Build frontend (vite) + server (tsc)
- `npm start` — Jalankan production build

## Fitur

### Onboarding
- Halaman onboarding 3 slide untuk pengguna baru (swipeable)
- Disimpan di `localStorage` (`t_onboarding_done`) — hanya muncul sekali
- File: `src/pages/OnboardingPage.tsx`

### Trip Search & Booking Flow
1. HomePage → pilih kota, tanggal, operator
2. SearchResultsPage → daftar jadwal dari semua operator
3. SelectStopsPage → pilih titik naik/turun (filter pakai `boardingAllowed`/`alightingAllowed`)
4. **Materialize** — trip virtual di-materialize lewat `POST /api/gateway/trips/materialize` (kirim `baseId`, `operatorSlug`, `serviceDate`)
5. SelectSeatsPage → pilih kursi dari seatmap
6. BookingConfirmPage → konfirmasi & bayar

### Halaman Tambahan
- **ProfilePage** — Profil user (info akun, menu navigasi ke help/notif/about, logout dengan konfirmasi)
- **HelpPage** — FAQ accordion dengan search, 10 pertanyaan dalam 4 kategori, tombol hubungi kami
- **NotificationsPage** — Daftar notifikasi (saat ini static/placeholder)
- **AboutPage** — Info versi app, link privacy/terms/contact/website

### Komponen Penting
- `OperatorBottomSheet` — filter operator (reusable, searchable)
- `OperatorLogo` — logo operator dengan fallback initial+color
- `CityBottomSheet` — pilih kota (tanpa auto-focus keyboard)

### Navigasi
- Tab "Akun" → ProfilePage (jika login) atau AuthPage (jika belum login)
- AuthPage redirect ke ProfilePage jika sudah login
- ProfilePage punya menu ke Notifikasi, Bantuan, dan Tentang Aplikasi

## Endpoint Gateway

### Sudah dipakai (`/api/gateway/*`):
- `GET /api/gateway/cities` — Daftar kota
- `GET /api/gateway/trips/search` — Pencarian jadwal
- `POST /api/gateway/trips/materialize` — Materialize trip virtual
- `GET /api/gateway/trips/{tripId}` — Detail trip
- `GET /api/gateway/trips/{tripId}/seatmap` — Seatmap
- `POST /api/gateway/bookings` — Buat pemesanan
- `GET /api/gateway/bookings/{bookingId}` — Detail pesanan

### Endpoint auth/booking (`/api/app/*`, diteruskan Console ke Terminal):
- `POST /api/app/auth/register` / `login` / `GET /api/app/auth/me`
- `GET /api/app/bookings` — Daftar pesanan
- `POST /api/app/bookings/{id}/cancel` — Batalkan pesanan

## Data Model Notes

- Semua trip dari search bisa virtual (`isVirtual: true`) — perlu materialize sebelum seatmap
- Raw stops tersedia di `raw.stops` pada search response — langsung digunakan tanpa fetch detail
- Stop filtering pakai `boardingAllowed`/`alightingAllowed` flags dari raw stops
- `operatorSlug` dikirim saat materialize (wajib di production Console)
