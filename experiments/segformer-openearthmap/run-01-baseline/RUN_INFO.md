# run-01-baseline — SegFormer OpenEarthMap

**Tanggal eksperimen:** 2026-07-13
**Eksperimen:** segformer-openearthmap / run-01-baseline

## Model

- **Model dasar:** `nvidia/segformer-b0-finetuned-ade-512-512`
- **Dataset:** OpenEarthMap
- **Jumlah kelas:** 9 (background, bareland, rangeland, developed, road, tree, water, agriculture, building)
- **Format bobot tersimpan:**
  - `model/pytorch/segformer_openearthmap.pth` — state_dict PyTorch
  - `model/huggingface/model.safetensors` + `config.json` + `preprocessor_config.json` — format HuggingFace

## Hasil Evaluasi

**Akurasi piksel: 12–23%** untuk klasifikasi 9 kelas (mendekati tebakan acak ~11% untuk 9 kelas seimbang).

Prediksi model masih didominasi satu kelas per gambar (lihat `eval/visualisasi/`) — ini tanda **under-training**, bukan masalah arsitektur/dataset.

## STATUS

> **BELUM SIAP PAKAI** — perlu retraining dengan epoch lebih banyak sebelum dipakai di layanan/API mana pun.

## Catatan

- Prediksi model masih didominasi satu kelas per gambar, tanda under-training.
- Belum ada kode layanan (FastAPI/serving) yang dibuat untuk model ini — sengaja ditunda sampai ada model dengan akurasi yang layak.
- File bobot model (`.pth`, `.safetensors`) **tidak ikut ter-commit ke Git** (lihat `.gitignore` di root repo) karena ukurannya besar — tersimpan lokal saja di struktur folder ini.
