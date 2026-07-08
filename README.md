# EcoSentra: Platform Analisis Lahan dan Ekosistem Indonesia 

[![Status Deploy](https://img.shields.io/badge/deploy-live-brightgreen.svg)](https://ecosentra.web.app)

**EcoSentra** adalah platform web canggih yang dirancang untuk menyediakan analisis mendalam mengenai tutupan lahan, kesehatan ekosistem, dan mitigasi bencana di seluruh Indonesia. Dengan memanfaatkan data satelit real-time dan kecerdasan buatan, platform ini bertujuan untuk mendukung pengambilan keputusan yang lebih baik dalam pengelolaan sumber daya alam.

**[Akses Live Demo »](https://ecosentra.web.app)**

---

## Fitur Utama

-   **Dashboard Interaktif:** Visualisasi data tutupan lahan, skor kesehatan, dan metrik penting lainnya dalam satu tampilan yang mudah dipahami.
-   **Peta Real-time:** Integrasi peta interaktif untuk eksplorasi data geografis, termasuk titik api dan sebaran vegetasi.
-   **Asisten AI (LandAI):** Chatbot cerdas yang dapat menjawab pertanyaan seputar data kehutanan, penyebab deforestasi, analisis NDVI, dan interpretasi data satelit.
-   **Peringatan Bencana:** Sistem monitoring titik api (hotspot) dari satelit NASA FIRMS untuk deteksi dini kebakaran hutan dan lahan.
-   **Dukungan Keputusan:** Menyediakan rekomendasi cerdas berdasarkan analisis data untuk membantu pengelolaan lahan yang lebih efektif dan berkelanjutan.
-   **Ekspor Data:** Kemampuan untuk mengunduh data analisis dalam berbagai format standar seperti GeoJSON, CSV, dan lainnya.

## Teknologi yang Digunakan

-   **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS
-   **Backend:** Next.js API Routes & Firebase Cloud Functions
-   **Database:** Google Cloud Firestore
-   **Hosting:** Firebase Hosting

## Struktur Repo

Repo ini adalah monorepo:

-   `apps/web` — Frontend (Next.js/TypeScript) & Backend API utama (Next.js API Routes di `apps/web/app/api`)
-   `services/ml` — Layanan ML (FastAPI/Python) — *placeholder, belum ada kode*
-   `services/mcp` — MCP server (Python) — *placeholder, belum ada kode*

Lihat [`docs/git-workflow.md`](./docs/git-workflow.md) untuk strategi branching dan alur kerja kontribusi.

## Cara Menjalankan Proyek Secara Lokal

Untuk developer yang ingin berkontribusi atau menjalankan proyek ini di mesin lokal.

1.  **Clone repositori ini:**
    ```bash
    git clone https://github.com/PashaAkrilian/Gemastik-2025.git
    cd Gemastik-2025/apps/web
    ```

2.  **Install dependensi:**
    ```bash
    npm install
    ```

3.  **Buat file `.env.local`:**
    Salin isi dari `.env.local.example` (jika ada) atau buat file baru dan isi dengan kredensial Firebase Anda.

4.  **Jalankan server pengembangan:**
    ```bash
    npm run dev
    ```

    Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

    ## Lisensi

    Proyek ini dilisensikan di bawah [MIT License](./License.txt).  
    Anda bebas menggunakan, menyalin, memodifikasi, dan mendistribusikan proyek ini untuk tujuan apa pun, selama tetap mencantumkan lisensi ini.

    Hak Cipta © 2025 tim EcoSentra – Ketua: PashaAkrilian
