const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Koneksi ke database MySQL
const db = mysql.createConnection({
  host: "bqum05drnznpr03ilj0y-mysql.services.clever-cloud.com",
  user: "urxjxdk1srnb59q4",
  password: "iqqpj9AuC7VGP7wdjd5W",
  database: "bqum05drnznpr03ilj0y",
});

db.connect((err) => {
  if (err) throw err;
  console.log("Database connected");
});

// Fungsi konversi nilai (jika nilai menggunakan skala 0-100)
function konversiNilai(nilai) {
  if (nilai >= 85) return 4.0; // A
  if (nilai >= 65) return 3.0; // B
  if (nilai >= 50) return 2.0; // C
  if (nilai >= 40) return 1.0; // D
  return 0.0; // E
}

// Endpoint untuk menghitung IPS dan IPK
app.get("/hitung-ips/:NIM", (req, res) => {
  const NIM = req.params.NIM;

  const sql = `
    SELECT 
      tb_mhs.nama_mhs, 
      tb_krs.nilai, 
      tb_mk.nama_mk, 
      tb_mk.sks, 
      tb_krs.semester 
    FROM tb_krs 
    JOIN tb_mk ON tb_krs.id_mk = tb_mk.id_mk
    JOIN tb_mhs ON tb_krs.NIM = tb_mhs.NIM
    WHERE tb_krs.NIM = ?
    ORDER BY tb_krs.semester, tb_mk.nama_mk
  `;

  db.query(sql, [NIM], (err, result) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res.status(500).json({ message: "Gagal mengambil data KRS" });
    }

    if (result.length === 0) {
      return res
        .status(404)
        .json({ message: "Data tidak ditemukan untuk NIM tersebut" });
    }

    const namaMahasiswa = result[0].nama_mhs;
    const mataKuliahPerSemester = {};
    const ipsPerSemester = {};
    const ipkData = [];
    let totalIPS = 0;

    // Proses data dan perhitungan IPS per semester
    result.forEach((row) => {
      const { semester, nama_mk, sks, nilai } = row;

      if (!mataKuliahPerSemester[semester]) {
        mataKuliahPerSemester[semester] = [];
      }
      mataKuliahPerSemester[semester].push({
        namaMataKuliah: nama_mk,
        sks: sks,
        nilai: nilai,
      });

      if (!ipsPerSemester[semester]) {
        ipsPerSemester[semester] = { totalNilai: 0, totalSKS: 0 };
      }
      if (nilai > 0 && sks > 0) {
        const nilaiSkala4 = konversiNilai(nilai);
        ipsPerSemester[semester].totalNilai += nilaiSkala4 * sks;
        ipsPerSemester[semester].totalSKS += sks;
      }
    });

    // Hitung IPS untuk setiap semester
    for (const semester in ipsPerSemester) {
      const { totalNilai, totalSKS } = ipsPerSemester[semester];
      const ips = totalSKS > 0 ? totalNilai / totalSKS : 0;
      ipkData.push(ips);
      totalIPS += ips;
    }

    // Hitung IPK dari rata-rata IPS
    const ipk = ipkData.length > 0 ? totalIPS / ipkData.length : 0;

    // Buat respons API
    const response = {
      message: "Perhitungan berhasil",
      nama: namaMahasiswa,
      nim: NIM,
      mataKuliahPerSemester: mataKuliahPerSemester,
      ipsPerSemester: ipkData.map((ips, index) => ({
        semester: index + 1,
        ips: ips.toFixed(2),
      })),
      ipk: ipk.toFixed(2), // IPK dengan dua desimal
    };

    res.status(200).json(response);
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
