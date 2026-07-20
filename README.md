# DLavie Dev Dashboard

> ⚠️ **README ini WAJIB dibaca oleh AI agent sebelum mengubah apa pun di repo ini.**

Panel admin untuk manajemen launcher DLavie. Dibangun sebagai **static SPA** dengan Vite + React + TypeScript, di-deploy ke GitHub Pages.

- **Live URL**: https://drmacze.github.io/DLavie-Dev-Dashboard/
- **Tech**: Vite 5 + React 18 + TypeScript 5 + Tailwind CSS 3 + TanStack Query 5
- **Auth**: Supabase (auth + RLS-protected database)
- **Deploy**: GitHub Actions workflow `.github/workflows/deploy.yml`

---

## 🚨 CRITICAL RULES FOR AI AGENTS

### 1. Supabase untuk AUTH + Community SAJA

Supabase project `lvmucsxbmadtsgrxuwmo` sudah exceed egress quota sejak July 2026.
- ✅ **MASIH BOLEH** pakai Supabase untuk auth (login admin) + RLS-protected tables (`profiles`, `posts`, `comments`, `follows`).
- ❌ **JANGAN** pakai Supabase untuk data publik (news, banner, version, manifest). Itu sudah dipindah ke GitHub raw di repo `DLavie-Launcher-Data`.

### 2. Jangan ubah auth flow

Auth flow sudah fix:
1. Login via Supabase `auth.signInWithPassword` (email + password)
2. Query `profiles` table: `SELECT role FROM profiles WHERE id = <user_id>`
3. If `role !== 'admin'` → tampilkan error + sign out
4. If `role === 'admin'` → redirect ke dashboard

**JANGAN** tambah role lain tanpa pertimbangan matang.

### 3. Jangan upload file ke Supabase Storage

Supabase Storage sudah quota-exceeded. Untuk upload patch/file:
- ❌ **JANGAN** pakai Supabase Storage
- ✅ **GUNAKAN** GitHub Release upload via API (lihat `lib/api.ts`)
- ✅ Atau upload manual via GitHub UI ke release `v26` di repo `DLavie-Launcher-Data`

### 4. Admin role bypass untuk `dlaviecom@gmail.com`

Email `dlaviecom@gmail.com` harus selalu dapat akses admin (developer bypass). Lihat `hooks/useAuth.tsx` dan `hooks/useAdminCheck.ts`.

### 5. Jangan pecah single-page app

Aplikasi ini SPA (single page app). Semua route di-handle client-side via React Router dengan `basename: /DLavie-Dev-Dashboard`. Jangan tambah server-side route.

### 6. Jangan ubah deploy workflow

`.github/workflows/deploy.yml` sudah dikonfigurasi:
- `npm ci` → install deps
- `npm run build` → build ke `dist/`
- Copy `index.html` → `404.html` (SPA deep-link support)
- Upload `dist/` sebagai Pages artifact
- Deploy ke GitHub Pages

Pages setting: **Source = GitHub Actions** (NOT legacy branch deploy).

---

## 📁 Struktur Project

```
DLavie-Dev-Dashboard/
├── src/
│   ├── main.tsx                # Entry point + QueryClient + BrowserRouter
│   ├── App.tsx                 # Router + AdminGate (protected routes)
│   ├── index.css               # Tailwind + global styles
│   ├── lib/
│   │   ├── supabase.ts         # Supabase client (singleton)
│   │   └── api.ts              # GitHub API + manifest + helpers
│   ├── components/
│   │   ├── Layout.tsx          # Sidebar + main wrapper
│   │   ├── Sidebar.tsx         # Navigasi 240px
│   │   ├── StatCard.tsx        # Kartu statistik
│   │   ├── Card.tsx            # Card + CardHeader
│   │   ├── Button.tsx          # Button (5 variant)
│   │   ├── Input.tsx           # Input / Textarea / Select
│   │   ├── Modal.tsx           # Modal + Badge
│   │   └── ComingSoon.tsx      # Template halaman Phase 2
│   ├── pages/
│   │   ├── Login.tsx           # Phase 1
│   │   ├── Dashboard.tsx       # Phase 1
│   │   ├── UploadPatch.tsx     # Phase 1
│   │   ├── ManifestEditor.tsx  # Phase 1
│   │   ├── Feed.tsx            # Phase 1
│   │   └── *.tsx               # 7 halaman Coming Soon
│   └── hooks/
│       ├── useAuth.tsx         # AuthProvider + useAuth
│       └── useAdminCheck.ts    # Verifikasi role admin
├── .github/workflows/deploy.yml
└── package.json
```

## Halaman

### Phase 1 (Aktif)

| Route           | Halaman           | Deskripsi                                              |
| --------------- | ----------------- | ------------------------------------------------------ |
| `/login`        | Login             | Email + password, Supabase auth                        |
| `/`             | Dashboard         | 4 stat cards + recent activity + info rilis            |
| `/upload`       | Upload Patch      | Form patch + SHA256 otomatis + preview manifest         |
| `/manifest`     | Manifest Editor   | Edit JSON + tabel file + validasi real-time            |
| `/feed`         | Feed / Berita     | CRUD post Supabase (read + create + delete)            |

### Phase 2 (Coming Soon)

- `/patches` — Patch Management
- `/maintenance` — Maintenance Mode Toggle
- `/users` — User Management
- `/notifications` — Push Notification
- `/stats` — Stats Dashboard
- `/tickets` — Support Tickets
- `/activity-log` — Activity Log

## Design System (Grok-inspired Minimal)

| Token              | Nilai      | Penggunaan                     |
| ------------------ | ---------- | ------------------------------ |
| `bg-base`          | `#000000`  | Background utama               |
| `bg-card`          | `#0A0A0A`  | Card background                |
| `text-primary`     | `#FFFFFF`  | Teks utama                     |
| `text-muted`       | `#6B7280`  | Teks sekunder                  |
| `accent-cyan`      | `#22D3EE`  | Aksi primer                   |
| `accent-violet`    | `#818CF8`  | Aksi sekunder                 |
| `border`           | `#1F2937`  | Border subtle                 |
| Radius card        | `12px`     |                                |
| Radius button      | `8px`      |                                |
| Radius input       | `6px`      |                                |
| Transition         | `200ms`    | Hover / focus                  |

## Tech Stack

- **Vite 5** + **React 18** + **TypeScript 5**
- **Tailwind CSS 3** — styling (Grok-inspired minimal theme)
- **React Router 6** — routing (`basename: /DLavie-Dev-Dashboard`)
- **TanStack Query 5** — data fetching & caching
- **Recharts** — chart library (siap dipakai di Phase 2)
- **Lucide React** — icon set
- **Supabase JS SDK** — auth + database

## Quick Start

```bash
# Install dependencies
npm install

# Jalankan dev server di http://localhost:5173/DLavie-Dev-Dashboard/
npm run dev

# Build production ke folder dist/
npm run build

# Preview hasil build secara lokal
npm run preview
```

## Auth Flow

1. User login via Supabase `auth.signInWithPassword` (email + password).
2. Setelah login, query `profiles` table: `SELECT role FROM profiles WHERE id = <user_id>`.
3. Jika `role !== 'admin'` → tampilkan error "Akun Anda bukan admin. Hubungi developer utama untuk akses." dan sign out otomatis.
4. Jika `role === 'admin'` → redirect ke dashboard.
5. Session persist di localStorage (Supabase handle otomatis).

## Deploy

Deploy otomatis via GitHub Actions pada setiap push ke `main`:

1. `npm ci` → install dependencies
2. `npm run build` → build ke `dist/`
3. Copy `index.html` → `404.html` (SPA deep-link support)
4. Upload `dist/` sebagai Pages artifact
5. Deploy ke GitHub Pages

URL produksi: **https://drmacze.github.io/DLavie-Dev-Dashboard/**

## Catatan Keamanan

- Supabase anon key bersifat **public** (RLS yang melindungi data, bukan key).
- Tidak ada service_role key di client.
- Semua tulisan ke Supabase memerlukan role admin (diverifikasi via `profiles.role`).
- Upload file ke GitHub Release memerlukan backend dengan token write access (Phase 2).

---

## 🌐 External URLs (konsisten lintas repo)

| Resource | URL |
|----------|-----|
| This dashboard | `https://drmacze.github.io/DLavie-Dev-Dashboard/` |
| Manifest (read) | `https://raw.githubusercontent.com/drmacze/DLavie-Launcher-Data/main/manifest.json` |
| DLavie-Launcher-Data repo | `https://github.com/drmacze/DLavie-Launcher-Data` |
| F16-Launcher repo | `https://github.com/drmacze/F16-Launcher` |
| dlavie-web | `https://drmacze.github.io/dlavie-web/` |
| Supabase URL | `https://lvmucsxbmadtsgrxuwmo.supabase.co` (auth + community only) |

---

## ❓ Pertanyaan yang sering muncul di AI agent

**Q: Boleh aku pakai Supabase table baru untuk fitur X?**
A: Hanya untuk data yang butuh RLS (user-scoped). Untuk data publik, pakai GitHub raw di `DLavie-Launcher-Data`.

**Q: Cara tambah halaman baru?**
A: Buat `src/pages/{Name}.tsx`, tambah route di `App.tsx`, tambah nav link di `Sidebar.tsx`.

**Q: Cara edit manifest dari dashboard?**
A: Halaman `/manifest` sudah ada editor. Pakai GitHub API untuk commit perubahan ke `DLavie-Launcher-Data/manifest.json`.

**Q: Cara upload patch baru?**
A: Halaman `/upload` sudah ada form. Upload ke release `v26` di `DLavie-Launcher-Data` via GitHub API. **JANGAN** pakai Supabase Storage.

**Q: Boleh ubah design system (warna, font)?**
A: Hati-hati. User sudah familiar dengan Grok-inspired minimal theme. Jika harus ubah, update `tailwind.config.js` + `src/index.css` sekaligus.

---

## 📚 Related Repos

| Repo | Purpose |
|------|---------|
| `F16-Launcher` | Android launcher app (Kotlin) |
| `dlavie-web` | Public website (HTML) |
| `DLavie-Launcher-Data` | Data resource (manifest, news, APK, OBB) |
| `DLavie-Patches` | FIFA 16 mod patches |

## Lisensi

Internal — DLavie Launcher.

---

**Terakhir diperbarui**: 2026-07-20
