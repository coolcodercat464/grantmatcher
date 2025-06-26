const { Pool } = require("pg");

// TODO: add actual names to .env
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "DATABASE NAME",
  password: "PASSWORD",
  port: 5432,
})

module.exports = {
    query: (text, params) => pool.query(text, params)
}