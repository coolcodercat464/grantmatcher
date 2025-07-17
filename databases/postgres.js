const { Pool } = require("pg");
require('dotenv').config();

// PostgreSQL is the data source
// this is where all the data is
// taken from

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "grantmatcher",
  password: process.env.DB_PASSWORD,
  port: 5432,
})

// i can connect with the database
// and get / insert / update its
// contents through this custom
// query function
module.exports = {
    query: (text, params) => pool.query(text, params)
}