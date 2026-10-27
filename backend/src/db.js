require("dotenv").config();

const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.query("SELECT NOW()")
  .then((res) => {
    console.log("PostgreSQL connected successfully!");
    console.log(res.rows[0]);
  })
  .catch((err) => {
    console.error("Database connection failed:", err.message);
  });

module.exports = pool;