const { Pool } = require("pg");
require('dotenv').config();

// TODO: add actual names to .env
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "grantmatcher",
  password: process.env.DB_PASSWORD,
  port: 5432,
})

module.exports = {
    query: (text, params) => pool.query(text, params)
}