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

// const db = mysql.createConnection({
//   host: "localhost",
//   user: "root",
//   password: "",
//   database: "ipk_ips_db",
// });

db.connect((err) => {
  if (err) throw err;
  console.log("Database connected");
});

// Endpoint untuk menghitung IPS
app.get("/hitung-ips/:NIM", (req, res) => {
  const NIM = req.params.NIM;

  // Query untuk mendapatkan data lengkap mahasiswa dan mata kuliah
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
      console.error("Error fetching KRS data:", err);
      return res.status(500).json({ message: "Gagal mengambil data KRS" });
    }

    if (result.length === 0) {
      return res
        .status(404)
        .json({ message: "Data tidak ditemukan untuk NIM tersebut" });
    }

    const namaMahasiswa = result[0].nama_mhs; // Nama mahasiswa dari data pertama
    const mataKuliahPerSemester = {};
    let totalNilai = 0;
    let totalSKS = 0;

    // Proses data mata kuliah dan perhitungan IPS
    result.forEach((row) => {
      const { semester, nama_mk, sks, nilai } = row;

      // Kelompokkan mata kuliah berdasarkan semester
      if (!mataKuliahPerSemester[semester]) {
        mataKuliahPerSemester[semester] = [];
      }
      mataKuliahPerSemester[semester].push({
        namaMataKuliah: nama_mk,
        sks: sks,
        nilai: nilai,
      });

      // Perhitungan total nilai dan SKS untuk menghitung IPK
      if (nilai > 0 && sks > 0) {
        totalNilai += nilai * sks;
        totalSKS += sks;
      }
    });

    // Hitung IPK (Indeks Prestasi Kumulatif)
    const ipk = totalSKS > 0 ? totalNilai / totalSKS : 0;

    // Buat respons API dengan data mata kuliah per semester
    const response = {
      message: "Perhitungan berhasil",
      nama: namaMahasiswa,
      nim: NIM,
      mataKuliahPerSemester: mataKuliahPerSemester,
      ipk: ipk.toFixed(2), // IPK dengan dua desimal
    };

    // Kirim respons
    res.status(200).json(response);
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
