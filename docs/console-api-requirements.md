# TransityConsole API Requirements — Payment & Voucher

Dokumen ini berisi requirement API baru yang dibutuhkan oleh TransityApp (frontend) untuk mendukung fitur pemilihan metode pembayaran, booking hold (unpaid), dan voucher/promo pada flow pemesanan tiket.

---

## Flow Pemesanan (Baru)

```
1. User isi data penumpang (BookingConfirmPage)
2. Klik "Pilih Pembayaran" →
   POST /api/gateway/bookings (tanpa paymentMethod) →
   Booking dibuat dengan status "held" + holdExpiresAt
3. User masuk PaymentPage → lihat countdown timer
4. Pesanan muncul di "Pesanan Saya" dengan status "Menunggu Pembayaran"
5. User pilih metode bayar, input voucher (opsional)
6. Klik "Bayar" →
   POST /api/gateway/bookings/{bookingId}/pay
7. Booking berubah ke status "confirmed"
8. Jika timer habis → booking otomatis expired/cancelled oleh backend
```

---

## 1. Update POST /api/gateway/bookings (Hold/Unpaid)

Endpoint booking yang sudah ada sekarang digunakan untuk **membuat booking tanpa pembayaran** (hold). Field `paymentMethod` menjadi opsional — jika tidak dikirim, booking dibuat dengan status `held`.

### Request

```
POST /api/gateway/bookings
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "tripId": "nusa-shuttle:abc-123",
  "serviceDate": "2026-04-08",
  "originStopId": "...",
  "destinationStopId": "...",
  "originSeq": 1,
  "destinationSeq": 5,
  "passengers": [
    {
      "fullName": "Rendy",
      "phone": "083139882231",
      "seatNo": "5A"
    }
  ]
}
```

### Perubahan

| Field           | Type   | Required | Keterangan                                                                  |
|-----------------|--------|----------|-----------------------------------------------------------------------------|
| `paymentMethod` | string | **Tidak** (sebelumnya wajib) | Jika tidak dikirim → booking dibuat sebagai held/unpaid        |

### Response — 201 Created

```json
{
  "bookingId": "bk_abc123",
  "status": "held",
  "totalAmount": "95000",
  "holdExpiresAt": "2026-04-08T10:30:00Z",
  "paymentIntent": null,
  "qrData": [],
  "passengers": [...],
  "tripId": "nusa-shuttle:abc-123"
}
```

### Catatan

- `holdExpiresAt` wajib diisi — ini adalah deadline pembayaran. Rekomendasi: 15-30 menit dari waktu booking.
- Saat status `held`, kursi harus sudah ter-reserve di Terminal sehingga tidak bisa dipesan orang lain.
- QR data tidak perlu digenerate sampai booking dibayar (`confirmed`).
- Jika waktu hold habis (`holdExpiresAt` terlewat), backend harus otomatis:
  1. Ubah status booking ke `expired` atau `cancelled`
  2. Lepaskan kursi yang di-hold di Terminal
- Terminal sudah support fitur booking tanpa pembayaran — Console perlu meneruskan ke Terminal tanpa mengirim payment info.

---

## 2. POST /api/gateway/bookings/{bookingId}/pay (BARU)

Endpoint baru untuk membayar booking yang sudah di-hold.

### Request

```
POST /api/gateway/bookings/{bookingId}/pay
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "paymentMethod": "qris",
  "voucherCode": "DISKON10"
}
```

| Field           | Type   | Required | Keterangan                                                             |
|-----------------|--------|----------|------------------------------------------------------------------------|
| `paymentMethod` | string | Ya       | ID metode pembayaran (dari `GET /api/gateway/payments/methods`)        |
| `voucherCode`   | string | Tidak    | Kode voucher yang sudah divalidasi (opsional)                          |

### Response — 200 OK

```json
{
  "bookingId": "bk_abc123",
  "status": "confirmed",
  "totalAmount": "85000",
  "holdExpiresAt": null,
  "paymentIntent": {
    "paymentId": "pay_xyz",
    "method": "qris",
    "amount": "85000"
  },
  "qrData": [
    {
      "passengerId": "p1",
      "seatNo": "5A",
      "fullName": "Rendy",
      "qrToken": "...",
      "qrPayload": "..."
    }
  ],
  "passengers": [...],
  "tripId": "nusa-shuttle:abc-123"
}
```

### Error Responses

| Status | Kode              | Keterangan                                      |
|--------|-------------------|-------------------------------------------------|
| 400    | `HOLD_EXPIRED`    | Waktu hold sudah habis, kursi sudah dilepas     |
| 400    | `ALREADY_PAID`    | Booking ini sudah dibayar                       |
| 404    | `BOOKING_NOT_FOUND`| Booking ID tidak ditemukan                     |
| 400    | `INVALID_METHOD`  | Metode pembayaran tidak valid/tidak aktif        |
| 400    | `VOUCHER_INVALID` | Kode voucher tidak valid atau sudah kadaluarsa   |

### Catatan

- Endpoint harus memvalidasi bahwa `holdExpiresAt` belum terlewat sebelum memproses pembayaran.
- Jika `voucherCode` dikirim, validasi dan terapkan diskon ke `totalAmount`.
- Setelah berhasil bayar:
  1. Ubah status ke `confirmed`
  2. Generate QR data untuk setiap penumpang
  3. Set `holdExpiresAt` ke `null` (tidak lagi perlu countdown)
  4. Konfirmasi pembayaran ke Terminal

---

## 3. GET /api/gateway/payments/methods

Mengembalikan daftar metode pembayaran yang tersedia dan aktif.

### Request

```
GET /api/gateway/payments/methods
Authorization: Bearer <token>   (opsional — bisa public atau per-user)
```

Tidak ada query parameter.

### Response — 200 OK

```json
{
  "methods": [
    {
      "id": "qris",
      "name": "QRIS",
      "type": "qris",
      "icon": "https://cdn.example.com/icons/qris.png",
      "description": "Scan QR dari e-wallet atau m-banking",
      "enabled": true
    },
    {
      "id": "ewallet_gopay",
      "name": "GoPay",
      "type": "ewallet",
      "icon": "https://cdn.example.com/icons/gopay.png",
      "description": "Bayar via GoPay",
      "enabled": true
    },
    {
      "id": "va_bca",
      "name": "Virtual Account BCA",
      "type": "virtual_account",
      "icon": null,
      "description": "Pembayaran via VA BCA",
      "enabled": true
    }
  ]
}
```

### Field per Method

| Field         | Type    | Required | Keterangan                                                                                       |
|---------------|---------|----------|--------------------------------------------------------------------------------------------------|
| `id`          | string  | Ya       | ID unik, akan dikirim sebagai `paymentMethod` saat pay booking                                  |
| `name`        | string  | Ya       | Nama tampil (contoh: "GoPay", "Transfer BCA")                                                   |
| `type`        | string  | Ya       | Kategori: `qris`, `ewallet`, `bank_transfer`, `virtual_account`, `other`                        |
| `icon`        | string? | Tidak    | URL ikon/logo (jika null, frontend pakai ikon default per type)                                  |
| `description` | string? | Tidak    | Deskripsi singkat (ditampilkan di bawah nama)                                                    |
| `enabled`     | boolean | Ya       | Apakah method ini aktif. Frontend hanya tampilkan yang `enabled: true`                           |

### Alternatif Response Format

Frontend juga mendukung format array langsung:

```json
[
  { "id": "qris", "name": "QRIS", ... },
  { "id": "ewallet_gopay", "name": "GoPay", ... }
]
```

Atau format `{ "data": [...] }`.

### Catatan

- Jika endpoint ini belum tersedia, TransityApp akan menggunakan daftar default (QRIS, GoPay, OVO, DANA, ShopeePay, VA BCA/Mandiri/BNI, Transfer Bank).
- Nilai `id` dari method akan dikirimkan sebagai `paymentMethod` pada `POST /api/gateway/bookings/{id}/pay`.
- Urutan tampil di frontend dikelompokkan berdasarkan `type` dengan urutan: QRIS → E-Wallet → Virtual Account → Transfer Bank → Lainnya.

---

## 4. POST /api/gateway/vouchers/validate

Validasi kode voucher/promo sebelum pembayaran dilakukan. Mengembalikan apakah voucher valid dan berapa diskon yang didapat.

### Request

```
POST /api/gateway/vouchers/validate
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "code": "DISKON10",
  "tripId": "bk_abc123",
  "amount": 95000
}
```

| Field    | Type   | Required | Keterangan                                                      |
|----------|--------|----------|-----------------------------------------------------------------|
| `code`   | string | Ya       | Kode voucher yang dimasukkan user                               |
| `tripId` | string | Ya       | Booking ID (digunakan untuk validasi scope voucher)              |
| `amount` | number | Ya       | Total harga sebelum diskon (untuk voucher berbasis persentase)   |

### Response — 200 OK (Valid)

```json
{
  "valid": true,
  "discount": 10000,
  "message": "Voucher berhasil diterapkan"
}
```

### Response — 200 OK (Tidak Valid)

```json
{
  "valid": false,
  "discount": 0,
  "message": "Kode voucher sudah kadaluarsa"
}
```

### Response — 400 / 404 (Error)

```json
{
  "error": "Kode voucher tidak ditemukan",
  "code": "VOUCHER_NOT_FOUND"
}
```

| Field      | Type    | Keterangan                                                   |
|------------|---------|--------------------------------------------------------------|
| `valid`    | boolean | Apakah voucher bisa dipakai                                  |
| `discount` | number  | Jumlah potongan dalam Rupiah (0 jika tidak valid)            |
| `message`  | string? | Pesan untuk ditampilkan ke user                              |

### Catatan

- Jika endpoint ini belum tersedia, frontend akan menampilkan error "Kode voucher tidak valid" untuk semua input.
- Validasi bersifat read-only (tidak mengunci voucher). Voucher baru di-redeem saat pembayaran berhasil.
- Scope voucher bisa per-operator, per-rute, atau global — tergantung implementasi Console.

---

## 5. GET /api/gateway/bookings (List — Update)

Response list booking sekarang perlu menyertakan `holdExpiresAt` agar frontend bisa menampilkan countdown pada pesanan yang belum dibayar.

### Perubahan Field per Item

| Field            | Type    | Baru?    | Keterangan                                                    |
|------------------|---------|----------|---------------------------------------------------------------|
| `holdExpiresAt`  | string? | **Ya**   | ISO datetime kapan hold berakhir. `null` jika sudah dibayar   |

### Contoh Item dengan Hold

```json
{
  "id": "bk_abc123",
  "tripId": "nusa-shuttle:abc-123",
  "serviceDate": "2026-04-08",
  "patternName": "Jakarta - Bandung",
  "status": "held",
  "totalAmount": "95000",
  "origin": { "name": "Cawang", "city": "Jakarta" },
  "destination": { "name": "Pasteur", "city": "Bandung" },
  "passengerCount": 1,
  "holdExpiresAt": "2026-04-08T10:30:00Z"
}
```

### Perilaku Frontend

- Pesanan dengan status `held` ditampilkan dengan badge "Menunggu" (warna kuning) dan countdown timer.
- Jika countdown habis, tampil "Kedaluwarsa".
- Backend harus mengubah status `held` → `expired`/`cancelled` setelah waktu habis (cleanup job atau on-demand check).

---

## Ringkasan Endpoint

| Endpoint                              | Method | Status     | Prioritas |
|---------------------------------------|--------|------------|-----------|
| `/api/gateway/bookings`              | POST   | **Update** | Tinggi    |
| `/api/gateway/bookings/{id}/pay`     | POST   | **Baru**   | Tinggi    |
| `/api/gateway/payments/methods`      | GET    | **Baru**   | Tinggi    |
| `/api/gateway/bookings`             | GET    | **Update** | Tinggi    |
| `/api/gateway/vouchers/validate`     | POST   | **Baru**   | Sedang    |

### Prioritas Implementasi

1. **Tinggi** — Update `POST /api/gateway/bookings` untuk support hold tanpa payment + `POST /api/gateway/bookings/{id}/pay` untuk bayar. Ini inti dari flow baru.
2. **Tinggi** — `GET /api/gateway/payments/methods` + update `GET /api/gateway/bookings` (list) dengan `holdExpiresAt`.
3. **Sedang** — `POST /api/gateway/vouchers/validate`. Fitur voucher bisa ditunda; frontend sudah handle gracefully jika endpoint belum ada.

### Backend Requirement: Hold Expiry Cleanup

Console perlu mekanisme untuk otomatis mengubah status `held` → `expired` setelah `holdExpiresAt` terlewat:
- **Option A**: Cron job / scheduler yang cek setiap menit
- **Option B**: Lazy evaluation — cek saat ada request ke booking tersebut
- **Option C**: Kombinasi A + B

Yang penting: kursi harus dilepas kembali ke Terminal saat hold expired, supaya bisa dipesan user lain.
