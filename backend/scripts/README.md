# Training Cocoa Object Verifier

Model verifier ini adalah classifier biner terpisah dari classifier kematangan ResNet18/EfficientNet-B0.
Inputnya adalah crop area panduan kamera atau satu gambar buah yang dipilih pengguna. Outputnya hanya
`cocoa` atau `non_cocoa`; model ini **tidak** menghasilkan bounding box.

## 1. Siapkan dataset

Buat struktur folder berikut dari gambar yang sudah memiliki label objek secara manual:

```text
data/cocoa_verifier/
├── train/
│   ├── cocoa/
│   └── non_cocoa/
├── val/
│   ├── cocoa/
│   └── non_cocoa/
└── test/
    ├── cocoa/
    └── non_cocoa/
```

- `cocoa`: foto buah kakao yang benar, mencakup variasi bentuk, warna, jarak, latar, pencahayaan, dan perangkat kamera.
- `non_cocoa`: daun, ranting, buah komoditas lain, benda rumah tangga, tangan, tanah, langit, dan objek yang mungkin keliru ditempatkan di area panduan.
- Jangan memasukkan gambar yang sama atau hasil burst dari objek/sesi pemotretan yang sama ke split berbeda. Pisahkan berdasarkan buah, pohon, lokasi, atau sesi pengambilan agar tidak terjadi data leakage.
- Pastikan gambar non-kakao benar-benar negatif. Jangan menganggap gambar blur atau gelap sebagai non-kakao; itu ditangani oleh pemeriksaan kualitas terpisah.
- Mulai dengan jumlah yang seimbang dan variasi kondisi yang representatif. Tambahkan data lapangan secara bertahap; jangan menilai kelayakan model hanya dari akurasi keseluruhan.

## 2. Instal dependensi AI

Dari folder `backend`:

```powershell
python -m pip install -r requirements-ai.txt
```

Pilih build PyTorch CPU/CUDA yang cocok dengan mesin dari https://pytorch.org/get-started/locally/ jika instalasi default tidak cocok.

## 3. Training

Dari folder `backend`:

```powershell
python scripts/train_cocoa_verifier.py --data-dir ../data/cocoa_verifier --epochs 25 --batch-size 32
```

Secara default script menggunakan bobot MobileNetV3-Small ImageNet dan memilih checkpoint berdasarkan macro F1 pada validation set. Test set hanya dipakai sekali untuk laporan akhir. Untuk lingkungan tanpa akses unduh bobot, tambahkan `--no-pretrained` (hasilnya dapat lebih buruk dan perlu dibandingkan).

Output:

- `models/cocoa_verifier_mobilenet_v3_small.pth`
- `models/cocoa_verifier_metrics.json`

Salin folder `models` di root proyek (bukan `backend/models`) ke mesin backend. Restart Uvicorn agar checkpoint dibaca.

## 4. Threshold dan kualitas frame

Threshold awal verifier adalah 0.70 dan dapat diubah lewat `COCOA_VERIFIER_THRESHOLD`. Ambang ini harus ditetapkan berdasarkan validation set serta konsekuensi false acceptance/false rejection. Threshold 0.70 bukan bukti akurasi 70%.

Pemeriksaan fokus memakai varians filter tepi sederhana; pencahayaan memakai rata-rata intensitas grayscale; resolusi minimal adalah 96 piksel pada sisi terpendek. Ketiganya merupakan quality gate heuristik awal yang wajib ditinjau dengan contoh lapangan sebelum digunakan operasional.
