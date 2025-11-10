# Script Video EverUndang

Panduan ini membagi alur presentasi ke dalam tiga bagian utama sesuai brief. Setiap bagian mencantumkan pembicara, durasi target, persiapan layar, dan dialog poin demi poin. Seluruh dialog disampaikan dalam Bahasa Indonesia.

> **Anggota & Peran Video**
> - Rodney Keilson – Host utama, Bagian 1, Bagian 2A/2D/2E, Demo Live (Bagian 3C) & Penutup.
> - Dylan Pratama Khu – Docker Frontend (Bagian 2B) + bagian awal demo compose.
> - Felix Willie – Docker Backend (Bagian 2C) + bagian lanjutan demo compose.
> - Charles – GitHub Actions / CI (Bagian 3A).
> - Jhonsen – Deploy & integrasi Render (Bagian 3B).

---

## Bagian 0 – Persiapan Umum (Off-camera sebelum rekaman)
- Pastikan OBS/recorder aktif, kualitas 1080p 60 fps, audio jelas.
- Buka VS Code workspace `EverUndang`. Pin tab berikut di editor: `README.md`, `docker-compose.yml`, `frontend/Dockerfile`, `backend/Dockerfile`, `frontend/.env.example`, `backend/.env.example`, `frontend/src/pages/AdminConsole.tsx`.
- Siapkan dua terminal PowerShell: satu di `backend`, satu di `frontend`; jaga agar bersih sebelum Bagian 2F.
- Di browser (Chrome/Edge), buka tiga tab: (1) GitHub repo `https://github.com/rodneykeilson/everundang` di tab *Code*, (2) tab *Actions*, (3) tab `https://everundang.onrender.com` tetapi **jangan** dimuat dulu (biarkan di halaman kosong sampai Bagian 3C).
- Pastikan layanan lokal tidak berjalan sebelum demo (`docker compose down -v`).

---

## Bagian 1 – Presentasi Proyek (±8 menit total)

### 1A. Pembukaan & Perkenalan (Rodney, ±2 menit)
- **Layar**: Slide pembuka atau jendela VS Code dengan `README.md` bagian judul di tampilan.
- **Dialog kunci**:
	1. "Selamat malam, kami dari tim EverUndang." (Rodney lihat kamera).
	2. Sebut judul proyek: "EverUndang – Platform Undangan Digital dengan alur DevOps yang lengkap." 
	3. Perkenalan anggota: "Tim kami terdiri dari Dylan Pratama Khu, Felix Willie, Charles, Jhonsen, dan saya Rodney Keilson."
	4. Jelaskan peran masing-masing: Dylan (Docker FE), Felix (Docker BE), Charles (CI GitHub Actions), Jhonsen (Deploy Render), Rodney (koordinasi fitur, arsitektur, demo live).
	5. Transisi: "Video ini dibagi tiga bagian: presentasi proyek, demo deployment lokal via Docker, dan demo aplikasi yang sudah live."

### 1B. Masalah & Solusi (Rodney, ±3 menit)
- **Layar**: VS Code `README.md`, scroll ke bagian deskripsi aplikasi.
- **Dialog**:
	1. Jelaskan pain point: "Banyak pasangan dan event organizer kesulitan menyiapkan undangan digital yang interaktif dan mudah dipantau."
	2. Tekankan kebutuhan: real-time RSVP, guestbook, admin oversight, templating.
	3. Tunjukkan fitur kunci sambil highlight list di README: hero landing, curated template, admin console, owner dashboard, statistik RSVP, generator QR.
	4. Kaitkan dengan DevOps: "Kami ingin pengalaman pengembangan dan operasi yang mulus — satu perintah untuk jalankan lokal, pipeline otomatis untuk deploy."

### 1C. Arsitektur & Teknologi (Rodney, ±3 menit)
- **Layar**: Buat panel split di VS Code atau sisipkan ASCII diagram di README (misal bawah deskripsi). Pastikan teks berikut terlihat: `[React/Vite] -> [Express/TypeScript] -> [PostgreSQL] -> [Render hosting]`, plus `[GitHub Actions]` di atas sebagai pipeline.
- **Dialog**:
	1. "Frontend kami dibangun dengan React + Vite dan TanStack Query untuk state data."
	2. "Backend menggunakan Express dengan TypeScript, terhubung ke PostgreSQL."
	3. "Docker Compose menyatukan semuanya — service database, API, dan frontend statis nginx."
	4. "Untuk otomasi, GitHub Actions membangun image dan push ke GitHub Container Registry, lalu Render menarik image tersebut." 
	5. Sebut environment penting: `VITE_API_URL`, `DATABASE_URL`, `ADMIN_SECRET`, `INVITE_OWNER_JWT_SECRET`.
	6. Tutup dengan transisi: "Selanjutnya kita masuk ke aspek DevOps — Dylan dan Felix akan memandu container masing-masing, dan saya akan menjelaskan orkestrasi compose."

---

## Bagian 2 – Demo Deployment Lokal (±10 menit total)

### 2A. Struktur Repository (Rodney, ±1.5 menit)
- **Layar**: VS Code Explorer. Collapse semua folder, lalu expand perlahan.
- **Dialog**:
	1. "Struktur repo kami rapi sesuai brief: folder `frontend/`, `backend/`, file `docker-compose.yml`, dan direktori `.github/workflows`."
	2. Tunjukkan folder `frontend` berisi `src`, `public`, `Dockerfile`. 
	3. Tunjukkan folder `backend` dengan `src`, `Dockerfile`, `dist`.
	4. Soroti `.github/workflows/ci.yml` dan `deploy.yml` sebagai pipeline.
	5. "Nantinya Charles dan Jhonsen akan membahas pipeline ini." 

### 2B. Dockerfile Frontend (Dylan, ±2 menit)
- **Layar**: Pastikan jendela VS Code menampilkan `frontend/Dockerfile` penuh (split pane jika perlu).
- **Dialog & Aksi sangat rinci**:
	1. Arahkan cursor ke baris pertama. Ucapkan: "Halo, saya Dylan. Sekarang saya tunjukkan Dockerfile untuk frontend kami. Baris pertama memakai base image `node:20.19-alpine` supaya build ringan dan konsisten."
	2. Seret mouse menyorot blok `FROM node:20.19-alpine AS deps` hingga `RUN npm ci`. Ucapkan: "Stage `deps` ini bertugas meng-install seluruh dependency secara bersih dengan `npm ci`, jadi hasilnya selalu cocok dengan `package-lock.json`."
	3. Scroll perlahan ke blok berikutnya `FROM deps AS build`. Ucapkan: "Stage kedua bernama `build`. Di sini kita menerima argumen `VITE_API_URL`. Saya highlight baris `ARG VITE_API_URL` dan `ENV VITE_API_URL=${VITE_API_URL}` supaya jelas bahwa URL API bisa dikonfigurasi waktu build." (Highlight baris tersebut).
	4. Tetap di stage `build`, sorot baris `RUN npm run build`. Ucapkan: "Perintah utama di stage ini menjalankan `npm run build` untuk menghasilkan folder produksi `dist`." 
	5. Scroll ke stage terakhir `FROM nginx:1.27-alpine AS runner`. Ucapkan: "Stage final menggunakan `nginx:1.27-alpine`. Kita copy `nginx.conf` kustom." Buka file `frontend/nginx.conf` di tab baru (Ctrl+Click). Ucapkan sambil menunjuk: "Di konfigurasi ini ada `try_files $uri $uri/ /index.html;` sehingga setiap permintaan SPA dialihkan kembali ke `index.html`."
	6. Buka cepat `frontend/public/static.json` (Ctrl+P, ketik `static.json`). Ucapkan: "Kami juga menambahkan `static.json` dengan isi `routes` seperti ini. Render membaca file ini untuk me-redirect `/*` ke `/index.html`, jadi akses langsung ke `/admin` atau `/i/slug` selalu berhasil."
	7. Tutup dengan kalimat: "Itu seluruh pipeline build frontend di dalam kontainer, sehingga hasilnya siap dijalankan oleh nginx." 

### 2C. Dockerfile Backend (Felix, ±2 menit)
- **Layar**: Tampilkan `backend/Dockerfile`.
- **Dialog & Aksi sangat rinci**:
	1. Ucapkan: "Saya Felix akan menjelaskan Dockerfile backend. Kami mulai lagi dari base `node:20.19-alpine` supaya ukuran image kecil dan dependensinya cocok." (Highlight baris pertama `FROM`).
	2. Sorot blok `WORKDIR /app` sampai `RUN npm ci`. Ucapkan: "Bagian ini memastikan kita masuk ke folder kerja `/app` dan memasang dependency backend tanpa membawa dev dependency tambahan." 
	3. Scroll ke stage `build`. Highlight `COPY tsconfig.json ./` hingga `RUN npm run build`. Ucapkan: "Stage `build` menyalin source TypeScript lalu menjalankan `npm run build`. Ini menghasilkan JavaScript di folder `dist` sehingga runtime tidak perlu compiler."
	4. Scroll ke stage terakhir. Highlight `FROM node:20.19-alpine` (kedua) hingga `CMD`. Ucapkan: "Stage final membuat image produksi. Kita hanya copy folder `dist` dan file `package.json` yang dibutuhkan. Perintah `RUN npm ci --omit=dev` memastikan hanya dependency produksi yang masuk." 
	5. Arahkan ke baris `EXPOSE 4000`. Ucapkan: "Port 4000 dibuka karena server Express kami berjalan di port ini."
	6. Akhiri: "Dengan struktur multi-stage seperti ini, image backend siap dibawa ke Render atau lingkungan lain tanpa beban berlebih." 

### 2D. docker-compose.yml (Rodney, ±2 menit)
- **Layar**: Buka `docker-compose.yml` (split view dengan editor full).
- **Dialog**:
	1. "Compose ini menyatukan tiga service utama: `db`, `backend`, `frontend`."
	2. "Service `db` pakai `postgres:15-alpine`, volume `pgdata`, environment default agar mudah di-setup." 
	3. "Service `backend` bergantung pada `db`, environment mengarah ke host Compose (`postgres://everundang:...@db:5432`)."
	4. "Service `frontend` bergantung pada backend, expose port 5173 yang kemudian dipetakan ke host." 
	5. "Satu perintah `docker compose up --build` sudah menghidupkan semua komponen." 

### 2E. Konfigurasi .env (Rodney, ±1.5 menit)
- **Layar**: Gunakan editor split dua kolom – kiri `frontend/.env.example`, kanan `backend/.env.example`.
- **Dialog**:
	1. "Frontend hanya butuh `VITE_API_URL`, tapi di production diisi via build arg/Render secrets." 
	2. "Backend memerlukan `DATABASE_URL`, `ADMIN_SECRET`, `FRONTEND_URL`, `INVITE_OWNER_JWT_SECRET`, `OWNER_TOKEN_TTL_SECONDS`."
	3. "README kami instruct `cp .env.example .env` agar penilai hanya perlu mengganti nilai sensitif."
	4. "Di Render, variabel ini disesuaikan dengan URL publik dan database managed." 

### 2F. Demo docker-compose (Dylan & Felix, ±3 menit)
- **Langkah Dylan (±1.5 menit, fokus perintah)**:
	1. Pastikan terminal PowerShell berada di folder root proyek (`EverUndang`). Tunjukkan prompt. Ucapkan: "Sekarang saya pastikan tidak ada kontainer lama dengan menjalankan `docker compose down -v`." Ketik perintah tersebut dan tekan Enter.
	2. Setelah perintah selesai, ucapkan: "Ini membersihkan semua service dan volume supaya kita mulai dari kondisi kosong."
	3. Lanjutkan: "Berikutnya saya jalankan build dan start sekaligus lewat `docker compose up --build`." Ketik perintah, tekan Enter.
	4. Sambil log berjalan, arahkan kursor ke bagian yang menunjukkan layer frontend dan backend. Ucapkan: "Di log ini terlihat tahap build frontend menyalin `static.json` dan menjalankan `npm run build`, sedangkan backend menjalankan `npm run build` untuk compile TypeScript." 
	5. Ketika log menunjukkan `nginx ... ready` dan `Backend listening on port 4000`, ucapkan: "Semua service sudah aktif: nginx melayani frontend dan Express sudah mendengarkan di port 4000." 
- **Langkah Felix (±1.5 menit, verifikasi & shutdown)**:
	1. Buka browser dan ketik `http://localhost:5173`. Ucapkan: "Saya akses frontend melalui port 5173 untuk memastikan landing page tampil."
	2. Buka tab baru `http://localhost:4000/health`. Ucapkan: "Endpoint health backend mengembalikan status `ok`, menandakan API siap." 
	3. Kembali ke terminal lain, jalankan `docker ps`. Ucapkan: "Perintah `docker ps` memperlihatkan tiga kontainer: database Postgres, backend, dan frontend."
	4. Tutup demo dengan perintah `docker compose down`. Ucapkan: "Terakhir saya hentikan semua service menggunakan `docker compose down` supaya lingkungan kembali bersih." 
	5. Serahkan kembali ke Rodney: "Sekian demo compose dari kami, selanjutnya Rodney akan melanjutkan." 

Transisi ke Bagian 3: Rodney kembali ambil alih, kalimat: "Setelah memastikan lingkungan lokal rapi, kami juga menyiapkan otomasi build dan deploy. Charles akan menunjukkan GitHub Actions-nya."

---

## Bagian 3 – Demo Aplikasi Live & Pipeline (±9 menit total)

### 3A. GitHub Actions / CI (Charles, ±3 menit)
- **Layar**: Browser tab GitHub → klik `Actions`. Pastikan run terbaru workflow `Deploy` terbuka.
- **Dialog & Aksi sangat rinci**:
	1. Ucapkan: "Saya Charles. Setiap kali ada push ke branch `main`, workflow `Deploy` otomatis jalan. Kita juga bisa trigger manual memakai tombol `Run workflow` di sini." (Arahkan kursor ke tombol hijau di pojok kanan).
	2. Scroll sedikit ke log ringkasan job. Ucapkan sambil menunjuk: "Workflow ini hanya punya satu job bernama `build-and-push`. Semua langkah build image ada di sini."
	3. Klik step pertama `Checkout repository`. Ucapkan: "Langkah pertama mengambil kode dari repository supaya runner GitHub Actions punya source terbaru." 
	4. Klik step `Set up QEMU` dan `Set up Docker Buildx`. Ucapkan: "Dua step ini penting untuk build lintas arsitektur. QEMU memungkinkan emulasi arsitektur lain, sedangkan Buildx memberi kemampuan build multi-stage dengan cache." 
	5. Klik step `Compute image prefix`. Ucapkan: "Di sini kita menyiapkan prefix nama image yaitu `ghcr.io/rodneykeilson/everundang`. Output step ini dipakai di langkah berikutnya." 
	6. Klik step `Extract backend metadata`. Ucapkan: "Metadata Action membuat daftar tag untuk backend. Di log ini terlihat tag `latest` dan tag SHA commit. Tag ini memastikan kita selalu punya versi terbaru sekaligus versi spesifik tiap commit." 
	7. Klik step `Build and push backend image`. Ucapkan sambil scroll log: "Langkah ini menjalankan docker build untuk backend dengan konteks folder `./backend`, lalu push ke GitHub Container Registry. Di sini tertulis tag yang dipush dan lapisan image yang dihasilkan." 
	8. Tunjukkan step `Extract frontend metadata` dan `Build and push frontend image`. Ucapkan: "Frontend mengikuti pola yang sama. Bedanya, kita menyuntikkan argumen build `VITE_API_URL` dari secret `FRONTEND_API_URL` sehingga bundel frontend mengenal alamat API produksi." 
	9. Tambahkan: "Setelah kedua image berhasil dipush, workflow selesai dengan status sukses. Rata-rata waktu pengerjaan sekitar tujuh menit dan tanpa campur tangan manual." 
	10. Tutup dengan kalimat: "Hasilnya, setiap perubahan kode otomatis menghasilkan image backend dan frontend baru yang siap diambil Render." 

### 3B. Deploy & Integrasi Render (Jhonsen, ±3 menit)
- **Layar**: Buka tab baru ke `https://dashboard.render.com`. Login terlebih dahulu. Siapkan tiga tab service: Postgres, Backend, Frontend.
- **Dialog & Aksi sangat rinci**:
	1. Ucapkan: "Saya Jhonsen. Setelah image dipush oleh GitHub Actions, Render langsung menarik image terbaru. Di dashboard Render ini, kita punya tiga service utama." Tunjukkan daftar service di sidebar.
	2. Klik service database (misal bernama `everundang-db`). Ucapkan: "Ini instance PostgreSQL terkelola. Render menyediakan koneksi aman, dan kami gunakan URL ini di environment backend." Tunjukkan tab `Info` dan highlight connection string (blur bila perlu).
	3. Klik tab `Environment` pada service backend (misal `everundang-backend`). Ucapkan: "Untuk backend, lingkungan Render menyimpan variabel penting seperti `DATABASE_URL`, `ADMIN_SECRET`, `FRONTEND_URL`, dan `INVITE_OWNER_JWT_SECRET`. Semua nilai ini diisi di dashboard sehingga kode tidak menyimpan kredensial." Sorot variabel satu per satu.
	4. Scroll ke bagian `Deploys` pada service backend. Ucapkan: "Setiap kali workflow selesai, Render memicu deploy baru yang mengambil image `ghcr.io/rodneykeilson/everundang-backend:latest`. Di sini terlihat riwayat deploy dan statusnya harus hijau."
	5. Beralih ke service frontend (misal `everundang-frontend`). Di tab `Environment`, tunjukkan `VITE_API_URL`. Ucapkan: "Frontend disiapkan dengan `VITE_API_URL` yang menunjuk ke domain backend Render, sehingga build mengikuti environment produksi." 
	6. Klik tab `Static Site` atau `Deploys` (sesuai UI). Ucapkan: "Render juga membaca `static.json` yang kita commit. Itu memastikan rute SPA seperti `/admin` tetap hidup." 
	7. Tutup penjelasan: "Jadi siklusnya lengkap: push ke main → GitHub Actions build image → Render auto-deploy tiga service ini dengan environment aman." 

### 3C. Demo Aplikasi Live (Rodney, ±4 menit)
- **Layar**: Buka tab `https://everundang.onrender.com`, tekan Ctrl+Shift+R untuk hard refresh.
- **Dialog & Langkah**:
	1. Tampilkan landing page: highlight hero, CTA `Create invitation`, highlight curated template grid.
	2. Scroll ke bagian `Live Invitations`, klik salah satu kartu → open detail `https://everundang.onrender.com/i/<slug>`. Tunjukkan hero, detail event, RSVP form.
	3. Kirim RSVP dummy (nama + status). Jelaskan feedback success.
	4. Kembali ke tab utama (via tombol back). Klik tombol `Admin Console`, masukkan admin secret (gunakan field input). Tunjukkan tabel undangan.
	5. Ubah status salah satu undangan via dropdown (misal switch ke `closed`) → perlihatkan toast "Status updated".
	6. Klik tombol `Copy owner link`, jelaskan bahwa token baru otomatis tersalin.
	7. (Opsional) Buka owner link di tab baru, tunjukkan dashboard owner dan statistik RSVP.
	8. Tutup dengan highlight footer, toggling language jika ingin menunjukkan fitur i18n.

### 3D. Penutup (Rodney, ±2 menit)
- **Layar**: Kembali ke landing page atau slide akhir.
- **Dialog**:
	1. "Itulah keseluruhan siklus DevOps EverUndang: dari kode, kontainer, pipeline, hingga live deployment."
	2. "Seluruh source tersedia di GitHub, dokumentasi lengkap di README, dan aplikasi live siap diuji." 
	3. Ucapkan terima kasih dan akhiri rekaman.

---

## Checklist Pasca Rekaman
- Pastikan rekaman tersimpan dalam format MP4 1080p.
- Upload ke Google Drive/YouTube.
- Tambahkan tautan ke `video/link_video.txt` di repo sesuai ketentuan tugas.
- Ulangi review audio & visual sebelum submit.
