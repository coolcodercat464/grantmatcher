// setup
const express = require('express');                       // import express
const path = require('path');                             // install path
const options = {root: path.join(__dirname, '/public')};  // set options root
const app = express();                                    // initialise app
const port = 3000;                                        // set port
const cors = require('cors');
app.use(cors());

const natural = require('natural'); // nlp for js (faster than python)

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

// link to python script
const spawn = require('child_process').spawn;

var myPythonScript = "main.py";
// Provide the path of the python executable, if python is available as 
// environment variable then you can use only "python"
var pythonExecutable = "python";

// Function to convert an Uint8Array to a string
var uint8arrayToString = function(data){
    return String.fromCharCode.apply(null, data);
};

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
app.get(['/', '/login', '/signup', '/addgrant', '/grant/:id', '/editgrant/:id', '/match/:id'], routes)
app.post(['/', '/login', '/signup', '/addgrant', '/editgrant/:id', '/match/:id', '/deletegrant/:id'], routes)

// database routes

// for code reuse
async function queryAll(table) {
  try {
    result = await db.query(`SELECT * FROM ${table}`);
    result = result.rows

    return result
  } catch {
    return []
  }
}

// database routs
app.get('/db/researchers', async (req, res) => {
  res.send(await queryAll('researchers'))
})

app.get('/db/grants', async (req, res) => {
  res.send(await queryAll('grants'))
})

app.get('/db/grants/version/:id', async (req, res) => {
  result = [] // what to put in res.send()

  try {
    result = await db.query(`SELECT "versionInformation" FROM grants WHERE "grantID" = $1`, [id]);
    result = result.rows
  } catch {

  }

  res.send(result)
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

// js nlp routes (faster but less accurate)

// when the user wants to match a word to the clusters
app.post('/clusterMatch', async (req, res) => {
  const receivedData = req.body;

  // get the clusters and the matchTo
  clusters = receivedData.clusters
  matchTo = receivedData.matchTo

  // store the result
  relevant = []
  
  for (x in clusters) {
    // get the name
    cluster = clusters[x].name

    // get the similarity
    distance = natural.JaroWinklerDistance(cluster, matchTo);

    // only add it to the relevant list if its above the threshold
    if (distance >= 0.5) {
      relevant.push(clusters[x])
    }
  }

  res.send({'relevant':relevant})
})

// python nlp routes

// TEST ROUTE (TODO)
app.post('/python', async (req, res) => {
    const receivedData = req.body;
    console.log(receivedData)
    
    const scriptExecution = spawn(pythonExecutable, 
      [myPythonScript, ["Quantum Mechanics", "cells", "Botany"], receivedData.word2]);

    // Handle normal output
    scriptExecution.stdout.on('data', async (data) => {
        try {
            console.log(data.toString())
            const result = JSON.parse(data.toString());
            res.send(result)
        } catch (err) {
            console.error("Error parsing JSON:", err);
        }
    });

    // Handle error output
    scriptExecution.stderr.on('data', (data) => {
      console.log(data.toString())
        res.send({'status': 'error'})
    });
})

// TEST ROUTE (TODO)
app.get('/test', (req, res) => {
    const scriptExecution = spawn(pythonExecutable, 
      [myPythonScript, ["Quantum Mechanics", "cells", "Botany"]]);

    // Handle normal output
    scriptExecution.stdout.on('data', async (data) => {
        try {
            console.log(data.toString())
            const result = JSON.parse(data.toString());
            res.send(result)
        } catch (err) {
            console.error("Error parsing JSON:", err);
        }
    });

    // Handle error output
    scriptExecution.stderr.on('data', (data) => {
      console.log(data.toString())
        res.send({'status': 'error'})
    });
})

// listen to port
app.listen(port, () => {
    console.log("Backend is listening on port 3000");
})

