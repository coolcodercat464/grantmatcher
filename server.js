// setup
const express = require('express');                       // import express
const path = require('path');                             // install path
const options = {root: path.join(__dirname, '/public')};  // set options root
const app = express();                                    // initialise app
const port = 3000;                                        // set port
const cors = require('cors');
app.use(cors());

const bodyParser = require('body-parser');                // bodyparser for forms
const routes = require('./routes/routing');               // set routing path
const { v4: uuidv4 } = require("uuid");                   // random strings
const session = require('express-session')                // sessions for remembering
const FileStore = require('session-file-store')(session); // session file store

// dot environment variables
require('dotenv').config()

app.engine('html', require('ejs').renderFile);            // allow html file rendering
app.use(express.static(path.join(__dirname, 'public')))   // set static files
app.set('view engine', 'html');                           // as ejs
app.set('views', path.join(__dirname, 'public'));         // set up views (static)
app.use(express.json())

// Sessions
app.use(session({
  genid: (req) => {
    return uuidv4()
  },
  store: new FileStore({path: path.join(__dirname, 'sessions')}),
  resave: false,
  secret: process.env.SESSIONS_SECRET,
  saveUninitialized: false,
  cookie: { maxAge: null}
}))

app.use(bodyParser.urlencoded({extended: true}));         // use bodyparser
const db = require('./databases/postgres.js')             // database stuff

// get and post routing
app.get(['/', '/login', '/signup'], routes)
app.post(['/', '/login', '/signup'], routes)

// database routes

// for code reuse
async function queryAll(table) {
  result = await db.query(`SELECT * FROM ${table}`);
  result = result.rows
    
  return result
}

app.get('/db/researchers', async (req, res) => {
  res.send(await queryAll('researchers'))
})

app.get('/db/grants', async (req, res) => {
  res.send(await queryAll('grants'))
})

app.get('/db/clusters', async (req, res) => {
  res.send(await queryAll('clusters'))
})

app.get('/db/users', async (req, res) => {
  res.send(await queryAll('users'))
})

app.get('/db/changelog', async (req, res) => {
  res.send(await queryAll('changelog'))
})

// listen to port
app.listen(port, () => {
    console.log("Backend is listening on port 3000");
})

