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
                       └─ /api/gateway/* (auth, trips, seatmap, bookings, operators)
```

Semua API request diarahkan ke Console Gateway. Auth terpusat di Console — satu akun berlaku untuk semua operator.

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

### Authentication (Console Gateway)
- Login dengan email ATAU nomor telepon (`POST /api/gateway/auth/login`)
- Registrasi customer baru (`POST /api/gateway/auth/register`) — semua field wajib (fullName, email, phone, password)
- Get profil (`GET /api/gateway/auth/me`)
- Update profil — nama dan/atau telepon (`PUT /api/gateway/auth/profile`)
- Ubah password (`POST /api/gateway/auth/change-password`)
- JWT token berlaku 30 hari, disimpan di localStorage

### Trip Search & Booking Flow
1. HomePage → pilih kota, tanggal
2. SearchResultsPage → daftar jadwal dari semua operator
3. SelectStopsPage → pilih titik naik/turun (filter pakai `boardingAllowed`/`alightingAllowed`)
4. **Materialize** — trip virtual di-materialize lewat `POST /api/gateway/trips/materialize`
5. SelectSeatsPage → pilih kursi dari seatmap
6. BookingConfirmPage → isi data penumpang → klik "Pilih Pembayaran" → **booking dibuat dengan status `held`** (kursi ter-reserve, belum bayar)
7. PaymentPage → countdown timer `holdExpiresAt`, pilih metode pembayaran, input voucher/promo → klik "Bayar" → `POST /api/gateway/bookings/{id}/pay`
8. BookingDetailPage → detail pesanan setelah berhasil dibayar

### Payment & Hold Flow
- Saat klik "Pilih Pembayaran", booking langsung dibuat tanpa `paymentMethod` → status `held` + `holdExpiresAt`
- Kursi sudah ter-reserve di Terminal sehingga tidak bisa diambil orang lain
- PaymentPage menampilkan countdown timer dari `holdExpiresAt`
- Jika waktu habis: tombol bayar disabled, user diarahkan kembali
- Pesanan `held` muncul di "Pesanan Saya" (MyTripsPage) dengan countdown timer
- Pembayaran via `POST /api/gateway/bookings/{id}/pay` dengan `paymentMethod` + opsional `voucherCode`
- Metode pembayaran diambil dari `GET /api/gateway/payments/methods` — jika API belum ada, fallback ke daftar default
- Input voucher/promo dengan validasi via `POST /api/gateway/vouchers/validate` — jika API belum ada, menampilkan error "tidak valid"
- Console API requirements didokumentasikan di `docs/console-api-requirements.md`

### Profile
- Info akun (nama, email, HP, tanggal bergabung)
- Edit profil (nama & no HP) via bottom sheet
- Ubah password via bottom sheet
- Menu navigasi ke help/notif/about
- Logout dengan konfirmasi

### Halaman Tambahan
- **HelpPage** — FAQ accordion dengan search
- **NotificationsPage** — Daftar notifikasi (placeholder)
- **AboutPage** — Info versi app

### Komponen Penting
- `PageHeader` — header halaman reusable (title, subtitle, back button, rightContent, children, sticky, className). Digunakan di semua halaman.
- `OperatorBottomSheet` — filter operator (reusable, searchable)
- `OperatorLogo` — logo operator dengan fallback initial+color
- `CityBottomSheet` — pilih kota (tanpa auto-focus keyboard)

### Navigasi
- Tab "Akun" → ProfilePage (jika login) atau AuthPage (jika belum login)
- AuthPage: toggle login/register, login toggle email/no HP
- ProfilePage: edit profil, ubah password, navigasi ke sub-pages

## Gateway API Endpoints (Console)

### Auth (`/api/gateway/auth/*`)
- `POST /api/gateway/auth/register` — Registrasi (fullName, email, phone, password)
- `POST /api/gateway/auth/login` — Login (email atau phone + password)
- `GET /api/gateway/auth/me` — Profil user (perlu Bearer token)
- `PUT /api/gateway/auth/profile` — Update profil (fullName, phone)
- `POST /api/gateway/auth/change-password` — Ganti password (currentPassword, newPassword)

### Trips (`/api/gateway/trips/*`)
- `GET /api/gateway/cities` — Daftar kota
- `GET /api/gateway/trips/search` — Pencarian jadwal (originCity, destinationCity, date, passengers)
- `GET /api/gateway/trips/{tripId}` — Detail trip
- `GET /api/gateway/trips/{tripId}/seatmap` — Seatmap (originSeq, destinationSeq, serviceDate)
- `GET /api/gateway/trips/{tripId}/reviews` — Ulasan trip
- `POST /api/gateway/trips/materialize` — Materialize trip virtual

### Operators
- `GET /api/gateway/operators/{slug}/info` — Info branding operator
- `GET /api/gateway/service-lines` — Daftar rute layanan

### Bookings (`/api/gateway/bookings/*`)
- `POST /api/gateway/bookings` — Buat pemesanan
- `GET /api/gateway/bookings/{bookingId}` — Detail pesanan
- `GET /api/gateway/bookings` — Daftar pesanan
- `POST /api/gateway/bookings/{id}/cancel` — Batalkan pesanan

## Data Model Notes

- User model: `{ id, fullName, email, phone, avatarUrl, createdAt }` (dari Console)
- Semua trip dari search bisa virtual (`isVirtual: true`) — perlu materialize sebelum seatmap
- Stop filtering pakai `boardingAllowed`/`alightingAllowed` flags
- `tripId` format: `{operatorSlug}:{originalId}` — jangan diparsing, kirim apa adanya
- Booking status: held → confirmed → completed (atau cancelled)
