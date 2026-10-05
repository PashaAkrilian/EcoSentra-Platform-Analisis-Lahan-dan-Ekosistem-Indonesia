# services/ml

**Tidak ada layanan ML di sini — dan itu disengaja.**

Aplikasi EcoSentra tidak memakai model machine learning sendiri: analisis tutupan lahan memakai
dataset hasil klasifikasi yang sudah matang (Esri / Impact Observatory 10 m, dan opsional
ESA WorldCover lewat `services/geo`).

Eksperimen pelatihan model segmentasi SegFormer ada di
[`experiments/segformer-openearthmap/`](../../experiments/segformer-openearthmap/run-01-baseline/RUN_INFO.md):
akurasi piksel baru **12–23%** untuk 9 kelas (mendekati tebakan acak) karena under-training, sehingga
**belum layak dipakai** dan sengaja tidak dibuatkan layanan serving.

## Jika ingin melanjutkan

1. Latih ulang dengan GPU dan epoch jauh lebih banyak (konfigurasi di `RUN_INFO.md`) sampai akurasi
   layak dibandingkan dataset Esri/ESA pada area uji Indonesia.
2. Baru setelah itu bangun layanan serving (FastAPI membungkus bobot Hugging Face) di folder ini
   dan sambungkan lewat `apps/web/server/sources/landcover.ts`.
3. Tanpa langkah 1, jangan menyajikan keluaran model ke pengguna.

Bobot model (`*.pth`, `*.safetensors`) tidak ikut Git (lihat `.gitignore`).
