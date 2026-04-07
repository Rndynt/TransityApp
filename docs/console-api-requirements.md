# TransityConsole API Requirements — Payment & Voucher

Dokumen ini berisi requirement API baru yang dibutuhkan oleh TransityApp (frontend) untuk mendukung fitur pemilihan metode pembayaran dan voucher/promo pada flow pemesanan tiket.

---

## 1. GET /api/gateway/payments/methods

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
| `id`          | string  | Ya       | ID unik, akan dikirim sebagai `paymentMethod` saat create booking                               |
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
- Nilai `id` dari method akan dikirimkan sebagai `paymentMethod` pada `POST /api/gateway/bookings`.
- Urutan tampil di frontend dikelompokkan berdasarkan `type` dengan urutan: QRIS → E-Wallet → Virtual Account → Transfer Bank → Lainnya.

---

## 2. POST /api/gateway/vouchers/validate

Validasi kode voucher/promo sebelum booking dibuat. Mengembalikan apakah voucher valid dan berapa diskon yang didapat.

### Request

```
POST /api/gateway/vouchers/validate
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "code": "DISKON10",
  "tripId": "nusa-shuttle:abc-123",
  "amount": 95000
}
```

| Field    | Type   | Required | Keterangan                                                      |
|----------|--------|----------|-----------------------------------------------------------------|
| `code`   | string | Ya       | Kode voucher yang dimasukkan user                               |
| `tripId` | string | Ya       | Trip ID yang sedang dipesan (untuk validasi scope voucher)       |
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
- Validasi bersifat read-only (tidak mengunci voucher). Voucher baru di-redeem saat booking berhasil dibuat.
- Scope voucher bisa per-operator, per-rute, atau global — tergantung implementasi Console.

---

## 3. Update POST /api/gateway/bookings

Field `paymentMethod` pada request booking sekarang berisi **ID metode pembayaran** dari endpoint `GET /api/gateway/payments/methods`, bukan lagi hardcoded `"cash"`.

### Perubahan Request

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
  ],
  "paymentMethod": "qris",
  "voucherCode": "DISKON10"
}
```

### Field Baru/Berubah

| Field           | Type   | Required | Keterangan                                                             |
|-----------------|--------|----------|------------------------------------------------------------------------|
| `paymentMethod` | string | Ya       | ID dari payment method (contoh: `"qris"`, `"ewallet_gopay"`, `"va_bca"`) — bukan lagi `"cash"` |
| `voucherCode`   | string | Tidak    | Kode voucher yang sudah divalidasi (opsional, jika user memasukkan voucher) |

### Catatan

- Console perlu memvalidasi `paymentMethod` terhadap daftar method yang aktif.
- Jika `voucherCode` dikirim, Console harus memvalidasi ulang dan menerapkan diskon ke total.
- Response booking yang sudah ada (`GatewayBookingResponse`) sudah cukup — tidak perlu perubahan response.

---

## Ringkasan Endpoint

| Endpoint                              | Method | Status     | Prioritas |
|---------------------------------------|--------|------------|-----------|
| `/api/gateway/payments/methods`       | GET    | **Baru**   | Tinggi    |
| `/api/gateway/vouchers/validate`      | POST   | **Baru**   | Sedang    |
| `/api/gateway/bookings`               | POST   | **Update** | Tinggi    |

### Prioritas Implementasi

1. **Tinggi** — `payments/methods` + update `bookings` dengan payment method yang valid. Tanpa ini, booking tidak bisa berhasil karena `"cash"` tidak diterima oleh Terminal.
2. **Sedang** — `vouchers/validate`. Fitur voucher bisa ditunda; frontend sudah handle gracefully jika endpoint belum ada.
