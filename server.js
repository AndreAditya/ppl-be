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

  // Query untuk mendapatkan nama mahasiswa dan data per semester dari tabel tb_krs dan tb_mk
  const sql = `
    SELECT tb_mhs.nama_mhs, tb_krs.nilai, tb_mk.sks, tb_krs.semester 
    FROM tb_krs 
    JOIN tb_mk ON tb_krs.id_mk = tb_mk.id_mk
    JOIN tb_mhs ON tb_krs.NIM = tb_mhs.NIM
    WHERE tb_krs.NIM = ?
    ORDER BY tb_krs.semester
  `;

  db.query(sql, [NIM], (err, result) => {
    if (err) {
      console.error("Error fetching KRS data:", err);
      return res.status(500).json({ message: "Gagal mengambil data KRS" });
    }

    // Pastikan result memiliki data
    if (result.length === 0) {
      return res
        .status(404)
        .json({ message: "Data tidak ditemukan untuk NIM tersebut" });
    }

    const namaMahasiswa = result[0].nama_mhs; // Menyimpan nama mahasiswa

    let ipsPerSemester = [];
    let totalNilai = 0;
    let totalSKS = 0;
    let totalIPS = 0;
    let semesterCount = 0;

    // Proses perhitungan IPS per semester
    result.forEach((krs) => {
      if (krs.nilai > 0 && krs.sks > 0) {
        // Menghitung IPS per semester
        const ipsSemester = krs.nilai; // Karena nilai sudah mengandung faktor SKS
        ipsPerSemester.push({
          semester: krs.semester,
          ips: ipsSemester, // Menambahkan IPS per semester
        });

        // Menghitung total nilai dan SKS untuk IPS keseluruhan
        totalNilai += krs.nilai * krs.sks;
        totalSKS += krs.sks;
      }
    });

    // IPS keseluruhan dihitung dengan rumus totalNilai / totalSKS
    const ips = totalSKS > 0 ? totalNilai / totalSKS : 0;

    // Menghitung IPK: rata-rata dari IPS per semester
    ipsPerSemester.forEach((semester) => {
      totalIPS += semester.ips; // Menjumlahkan IPS per semester untuk IPK
      semesterCount++; // Menghitung jumlah semester
    });

    // IPK dihitung sebagai rata-rata dari IPS per semester
    const ipk = semesterCount > 0 ? totalIPS / semesterCount : 0;

    // Insert data IPK ke dalam tabel tb_ipk tanpa semester
    const tahun = new Date().getFullYear(); // Mengambil tahun sekarang

    const sqlInsert = `
      INSERT INTO tb_ipk (NIM, tahun, ipk)
      VALUES (?, ?, ?)
    `;

    db.query(sqlInsert, [NIM, tahun, ipk], (err, insertResult) => {
      if (err) {
        console.error("Error inserting IPK:", err);
        return res.status(500).json({ message: "Gagal menyimpan data IPK" });
      }

      // Kirimkan respons dengan data nama, nim, hasil IPS, dan IPK
      res.status(200).json({
        message: "Perhitungan berhasil",
        nama: namaMahasiswa, // Menampilkan nama mahasiswa
        nim: NIM,
        ipsPerSemester: ipsPerSemester, // Menampilkan IPS per semester
        ipk: ipk, // Menampilkan IPK yang dihitung
      });
    });
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
