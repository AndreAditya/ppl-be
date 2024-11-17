const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// Koneksi ke database MySQL
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "ipk_ips_db",
});

db.connect((err) => {
  if (err) throw err;
  console.log("Database connected");
});

// Endpoint untuk mengambil data mata kuliah
app.get("/mata-kuliah", (req, res) => {
  const sql = "SELECT * FROM tb_mk";
  db.query(sql, (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Gagal mengambil data mata kuliah" });
    }
    res.status(200).json(result);
  });
});

// Endpoint untuk menambahkan mata kuliah baru
app.post("/add-mata-kuliah", (req, res) => {
  const { nama_mk, sks } = req.body;
  const sql = "INSERT INTO tb_mk (nama_mk, sks) VALUES (?, ?)";
  db.query(sql, [nama_mk, sks], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Gagal menambahkan mata kuliah" });
    }
    res.status(200).json({ id_mk: result.insertId, nama_mk, sks });
  });
});

// Endpoint untuk menambahkan KRS
app.post("/add-krs", (req, res) => {
  const { NIM, id_mk, nilai, semester, tahun } = req.body;

  // Ambil nilai SKS berdasarkan id_mk
  const sqlSks = "SELECT sks FROM tb_mk WHERE id_mk = ?";
  db.query(sqlSks, [id_mk], (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Gagal mengambil SKS mata kuliah" });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: "Mata kuliah tidak ditemukan" });
    }

    const sks = result[0].sks;

    // Menambahkan data KRS
    const sql =
      "INSERT INTO tb_krs (NIM, id_mk, nilai, sks, semester, tahun) VALUES (?, ?, ?, ?, ?, ?)";
    db.query(sql, [NIM, id_mk, nilai, sks, semester, tahun], (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Gagal menambahkan KRS" });
      }
      res.status(200).json({ message: "KRS berhasil ditambahkan" });
    });
  });
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
