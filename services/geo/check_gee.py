"""Script sementara untuk memverifikasi koneksi ke Google Earth Engine.

Jalankan manual: python test_gee.py
Hapus/abaikan setelah TAHAP 2 selesai — logika asli akan pindah ke
gee_service.py (TAHAP 4).
"""
import os
import sys

from dotenv import load_dotenv

load_dotenv()


def main() -> int:
    service_account = os.environ.get("GEE_SERVICE_ACCOUNT")
    key_path = os.environ.get("GEE_KEY_PATH")

    if not service_account or not key_path:
        print(
            "ERROR: GEE_SERVICE_ACCOUNT dan GEE_KEY_PATH wajib di-set "
            "di file .env (lihat .env.example)."
        )
        return 1

    if not os.path.isfile(key_path):
        print(f"ERROR: File key tidak ditemukan di path: {key_path}")
        return 1

    try:
        import ee
    except ImportError:
        print(
            "ERROR: Package 'earthengine-api' belum terpasang. "
            "Jalankan: pip install -r requirements.txt"
        )
        return 1

    try:
        credentials = ee.ServiceAccountCredentials(service_account, key_path)
        ee.Initialize(credentials)
        # Panggilan hitung sederhana ke server GEE — memastikan benar-benar
        # terhubung, bukan cuma inisialisasi lokal yang "terlihat" sukses.
        result = ee.Number(1).add(1).getInfo()
        if result != 2:
            print(f"ERROR: Respons GEE tidak sesuai ekspektasi: {result}")
            return 1
    except Exception as exc:
        print(f"ERROR: Gagal terhubung ke Google Earth Engine: {exc}")
        return 1

    print("GEE OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
