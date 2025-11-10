# Laporan Proyek DevOps "EverUndang"

## 1. Informasi Aplikasi dan Anggota Kelompok

- **Nama Aplikasi**: EverUndang
- **Deskripsi Singkat**: Platform undangan digital interaktif yang menyediakan landing page, konsol admin, dashboard pemilik, RSVP real-time, guestbook, serta generator kode tamu. Proyek dikembangkan end-to-end menggunakan pendekatan DevOps (Docker, GitHub Actions, Render).

**Anggota Kelompok**

| Nama | NIM | Peran DevOps & Pengembangan |
| --- | --- | --- |
| Rodney Keilson | 221110593 | Koordinasi fitur, arsitektur, orkestrasi Docker Compose, konfigurasi Render, demo live |
| Charles | 221110156 | CI/CD pipeline GitHub Actions (checkout → Buildx → push image) |
| Felix Willie | 221110667 | Docker backend multi-stage, reliabilitas API |
| Dylan Pratama Khu | 221110781 | Docker frontend multi-stage, pipeline build SPA |
| Jhonsen | 221112939 | Deployment dan environment Render (web service, static site, Postgres) |

---

## 2. Deskripsi Aplikasi & Tata Cara Penggunaan

EverUndang memungkinkan tim event mengelola undangan digital secara end-to-end:

1. **Landing Page Publik**: menampilkan fitur produk, daftar undangan yang sudah live, dan CTA untuk membuat undangan baru.
2. **Pembuatan Undangan**: pengguna mengisi informasi pasangan, acara, dan konten tambahan. Sistem menghasilkan tautan pemilik dan slug publik.
3. **Dashboard Pemilik** (`/edit/:id?token`):
   - Mengubah desain, status (`draft/published/closed`), kapasitas RSVP.
   - Melihat statistik RSVP real-time, daftar tamu, dan guestbook.
   - Menghasilkan kode tamu, rotasi tautan pemilik, serta mengunduh QR menuju undangan publik.
4. **Halaman Publik Undangan** (`/i/:slug`): tamu melihat detail acara, mengirim RSVP, dan menulis guestbook.
5. **Konsol Admin** (`/admin`): setelah memasukkan `ADMIN_SECRET`, admin dapat melihat semua undangan, mengubah status, menyalin owner link, dan menghapus undangan.

Cara penggunaan utama:
- Buka landing page → klik `Create invitation` → isi form → simpan owner link.
- Admin menggunakan `ADMIN_SECRET` untuk memantau semua undangan.
- Pemilik memakai dashboard untuk memonitor RSVP dan mengatur undangan.
- Tamu menerima slug publik (`/i/slug`) untuk RSVP dan guestbook.

---

## 3. Informasi Detail Aplikasi & Sumber Referensi

### Arsitektur dan Teknologi

```
🧑‍💻 Frontend (React + Vite + TanStack Query)
                │ REST/JSON fetch
🔧 Backend (Express + TypeScript)
                │ SQL via pg
🗄️ Database (PostgreSQL)

Infra & DevOps: Docker Compose · GitHub Actions · Render (static site + web service)
```

- **Frontend**: React + Vite SPA, state fetching oleh TanStack Query. Build hasil ekspor disajikan nginx.
- **Backend**: Express + TypeScript, validasi Zod, JWT untuk owner, endpoint REST `/api/invitations`, `/api/invitations/:slug`, dsb.
- **Database**: PostgreSQL menyimpan entitas undangan, RSVP, guestbook, guest codes.
- **Infra/DevOps**:
  - Docker Compose untuk menjalankan Postgres, backend, frontend secara lokal.
  - Dockerfile multi-stage (frontend & backend) memastikan ukuran image kecil dan deterministik.
  - GitHub Actions workflow `Deploy` membangun dan mem-push image ke GitHub Container Registry.
  - Render (Static Site + Web Service + Managed PostgreSQL) menarik image terbaru dan menjalankan environment produksi.

Sumber kode utama:
- Repo GitHub: <https://github.com/rodneykeilson/everundang>
- Struktur penting: `frontend/`, `backend/`, `.github/workflows/`, `docker-compose.yml`, `README.md`, `script-video.md`.

---

## 4. Informasi File Pendukung / Aplikasi Tambahan

- **Docker**: digunakan untuk membungkus frontend dan backend (multi-stage build).
- **Docker Compose**: mengorkestrasi container Postgres, backend, frontend untuk pengujian lokal.
- **GitHub Actions**: workflow `Deploy` (push ke `main` atau manual dispatch) melakukan:
  - Checkout repository
  - Setup QEMU & Buildx
  - Generate metadata dan tag (`latest`, `sha`)
  - Build & push image backend dan frontend ke `ghcr.io/rodneykeilson/everundang-*`
- **Render**: men-deploy tiga komponen
  - Static site (frontend) menggunakan `nginx` + `static.json` rewrite
  - Web service (backend) menjalankan image Express
  - Managed PostgreSQL instance
- **OneDrive Project Assets**: <https://mikroskilacid-my.sharepoint.com/:f:/g/personal/221110593_students_mikroskil_ac_id/EmE9NDR1_H5OgefB8lWTo5cBCU7_ryZQ2uYvoPGv8m8PWw?e=ccKLse>

---

## 5. Link Video – Implementasi Deploy Aplikasi (Container)

_(Belum diunggah – siapkan rekaman sesuai `script-video.md`, lalu letakkan URL di `video/link_video.txt` dan perbarui bagian ini.)_

---

## 6. Link Video – Implementasi CI/CD pada Container

_(Belum diunggah – gunakan video yang sama atau segmen khusus yang membahas GitHub Actions & Render. Cantumkan URL setelah tersedia.)_

---

## Lampiran Ringkas Proses DevOps

1. Pengembangan fitur dilakukan pada branch, lalu merge/push ke `main`.
2. GitHub Actions `Deploy` otomatis build & push image ke GHCR.
3. Render menarik image `latest`, menjalankan deploy, dan menyalakan service.
4. SPA rewrite (`static.json` + `nginx try_files`) memastikan routing `/admin`, `/i/:slug` tetap hidup meski deep link.
5. Environment variable di Render menyelaraskan konfigurasi dengan `.env.example`.

---

**Status Terkini**
- Aplikasi live: <https://everundang.onrender.com>
- README & skrip video mencakup seluruh kebutuhan dokumentasi.
- Pending: Upload video dan tambahkan tautan final ke bagian 5 & 6 (serta `video/link_video.txt`).
