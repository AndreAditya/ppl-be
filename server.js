const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const app = express();
const port = 5000;

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

// Endpoint untuk menghitung IPS
app.get("/hitung-ips/:NIM", (req, res) => {
  const NIM = req.params.NIM;

  // Query untuk mendapatkan nilai dan SKS
  const sql = `
    SELECT tb_krs.nilai, tb_mk.sks 
    FROM tb_krs 
    JOIN tb_mk ON tb_krs.id_mk = tb_mk.id_mk
    WHERE tb_krs.NIM = ?
  `;

  db.query(sql, [NIM], (err, result) => {
    if (err) {
      console.error("Error fetching KRS data:", err);
      return res.status(500).json({ message: "Gagal mengambil data KRS" });
    }

    let totalNilai = 0;
    let totalSKS = 0;

    result.forEach((krs) => {
      totalNilai += krs.nilai * krs.sks;
      totalSKS += krs.sks;
    });

    const ips = totalSKS > 0 ? totalNilai / totalSKS : 0;

    // Query untuk menghitung IPK dari tabel tb_ipk
    const sqlIpk = `
      SELECT ips, semester 
      FROM tb_ipk 
      WHERE NIM = ?
    `;
    db.query(sqlIpk, [NIM], (err, ipkResult) => {
      if (err) {
        console.error("Error fetching IPK data:", err);
        return res.status(500).json({ message: "Gagal mengambil data IPK" });
      }

      // Hitung IPK berdasarkan data IPS sebelumnya
      let totalIPS = ips;
      let semesterCount = 1;

      if (ipkResult.length > 0) {
        ipkResult.forEach((data) => {
          totalIPS += data.ips;
          semesterCount++;
        });
      }

      const ipk = totalIPS / semesterCount;

      // Masukkan data IPS dan IPK ke tabel tb_ipk
      const semester = `Semester ${semesterCount}`;
      const tahun = new Date().getFullYear(); // Contoh tahun sekarang

      const sqlInsert = `
        INSERT INTO tb_ipk (NIM, semester, tahun, ips, ipk)
        VALUES (?, ?, ?, ?, ?)
      `;

      db.query(
        sqlInsert,
        [NIM, semester, tahun, ips, ipk],
        (err, insertResult) => {
          if (err) {
            console.error("Error inserting IPS/IPK:", err);
            return res
              .status(500)
              .json({ message: "Gagal menyimpan data IPS/IPK" });
          }

          res.status(200).json({
            message: "Perhitungan berhasil",
            ips,
            ipk,
          });
        }
      );
    });
  });
});

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
