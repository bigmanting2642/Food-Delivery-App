const { Pool } = require("pg");
require("dotenv").config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});

console.log("DEBUG DATABASE_URL:", process.env.DATABASE_URL);

module.exports = pool;
