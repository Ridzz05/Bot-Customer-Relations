# 🤖 Manajemen Pelanggan Bot

Telegram Bot untuk mencatat data pelanggan ke database Supabase, di-deploy ke Vercel menggunakan metode Webhook.

## Tech Stack

- **Runtime:** Node.js (Vercel Serverless Function)
- **Bot Framework:** [Telegraf v4](https://telegraf.js.org/)
- **Database:** [Supabase](https://supabase.com/) (PostgreSQL)
- **Deployment:** [Vercel](https://vercel.com/)

---

## 📦 Setup Database (Supabase)

Buka **SQL Editor** di dashboard Supabase, lalu jalankan query berikut:

```sql
-- Tabel Layanan
CREATE TABLE layanan (
  id SERIAL PRIMARY KEY,
  nama_layanan TEXT NOT NULL UNIQUE
);

-- Tabel Pelanggan
CREATE TABLE pelanggan (
  id SERIAL PRIMARY KEY,
  nama_pelanggan TEXT NOT NULL,
  nama_layanan TEXT NOT NULL REFERENCES layanan(nama_layanan),
  durasi_waktu TEXT NOT NULL,
  tanggal_masuk TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk performa query
CREATE INDEX idx_pelanggan_layanan ON pelanggan(nama_layanan);
```

---

## ⚙️ Environment Variables

Buat file `.env` (untuk lokal) atau set di **Vercel Dashboard > Settings > Environment Variables**:

| Variable       | Keterangan                              |
| -------------- | --------------------------------------- |
| `BOT_TOKEN`    | Token bot dari [@BotFather](https://t.me/BotFather) |
| `SUPABASE_URL` | URL project Supabase (`https://xxx.supabase.co`) |
| `SUPABASE_KEY` | Anon key dari Supabase (Settings > API) |
| `OWNER_ID`     | Telegram User ID owner (cek via [@userinfobot](https://t.me/userinfobot)) |

---

## 🚀 Deploy ke Vercel

### 1. Push ke GitHub

```bash
git add .
git commit -m "Initial commit: Telegram Bot Manajemen Pelanggan"
git push origin main
```

### 2. Import Project di Vercel

1. Buka [vercel.com/new](https://vercel.com/new)
2. Import repository dari GitHub
3. Tambahkan **Environment Variables** (`BOT_TOKEN`, `SUPABASE_URL`, `SUPABASE_KEY`)
4. Klik **Deploy**

### 3. Set Webhook (Manual)

Setelah deploy berhasil, set webhook Telegram dengan membuka URL berikut di browser:

```
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://<NAMA_PROJECT>.vercel.app/api/webhook
```

**Contoh:**

```
https://api.telegram.org/bot123456:ABC-DEF/setWebhook?url=https://manajemen-pelanggan-bot.vercel.app/api/webhook
```

Jika berhasil, akan muncul respons:

```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was set"
}
```

### Cek Status Webhook

```
https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo
```

### Hapus Webhook (jika perlu)

```
https://api.telegram.org/bot<BOT_TOKEN>/deleteWebhook
```

---

## 🤖 Daftar Perintah

| Perintah | Contoh | Keterangan |
| -------- | ------ | ---------- |
| `/start` | `/start` | Menampilkan pesan selamat datang & panduan |
| `tambah layanan` | `tambah layanan Internet Fiber` | Menambah kategori layanan baru |
| `tambah pelanggan` | `tambah pelanggan "Budi" "Internet Fiber" "30 Hari"` | Menambah data pelanggan |
| `daftar layanan` | `daftar layanan` | Melihat daftar layanan yang tersedia |

> 💡 Gunakan tanda kutip `"..."` untuk nama/layanan yang mengandung spasi.

---

## 📁 Struktur Project

```
Manajemen-Pelanggan-Bot/
├── api/
│   └── webhook.js      # Handler utama (bot + serverless)
├── .env.example         # Template environment variables
├── package.json         # Dependencies
├── vercel.json          # Konfigurasi Vercel
└── README.md            # Dokumentasi
```

---

## License

MIT
