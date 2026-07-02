# DLavie Dev Dashboard

Panel admin untuk manajemen launcher DLavie. Dibangun sebagai **static SPA** dengan Vite + React + TypeScript, di-deploy ke GitHub Pages.

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

## Struktur Project

```
src/
├── main.tsx                # Entry point + QueryClient + BrowserRouter
├── App.tsx                 # Router + AdminGate (protected routes)
├── index.css               # Tailwind + global styles
├── lib/
│   ├── supabase.ts         # Supabase client (singleton)
│   └── api.ts              # GitHub API + manifest + helpers
├── components/
│   ├── Layout.tsx          # Sidebar + main wrapper
│   ├── Sidebar.tsx         # Navigasi 240px
│   ├── StatCard.tsx        # Kartu statistik
│   ├── Card.tsx            # Card + CardHeader
│   ├── Button.tsx          # Button (5 variant)
│   ├── Input.tsx           # Input / Textarea / Select
│   ├── Modal.tsx           # Modal + Badge
│   └── ComingSoon.tsx      # Template halaman Phase 2
├── pages/
│   ├── Login.tsx           # Phase 1
│   ├── Dashboard.tsx       # Phase 1
│   ├── UploadPatch.tsx     # Phase 1
│   ├── ManifestEditor.tsx  # Phase 1
│   ├── Feed.tsx            # Phase 1
│   └── *.tsx               # 7 halaman Coming Soon
└── hooks/
    ├── useAuth.tsx         # AuthProvider + useAuth
    └── useAdminCheck.ts    # Verifikasi role admin
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

## Lisensi

Internal — DLavie Launcher.
