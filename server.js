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

// database stuff
app.get(['/db/grants', '/db/researchers', '/db/users', '/db/clusters', '/db/changelog', '/db/grants/version/:id', '/db/codes', '/db/researchers/version/:id'], routes) 
// nlp routes
app.post(['/clustermatch', '/match', '/recalculate'], routes) 

// essentials
app.get(['/', '/login', '/signup'], routes)
app.post(['/', '/login', '/signup'], routes)

// grants
app.get(['/addgrant', '/grant/:id', '/editgrant/:id', '/match/:id'], routes)
app.post(['/addgrant', '/editgrant/:id', '/deletegrant/:id', '/deleteresearcher/:id','/confirmmatch/:id'], routes)

// researchers
app.get(['/recalculate', '/researcher/:id', '/editresearcher/:id', '/addresearcher'], routes)
app.post(['/addclusters', '/confirmrecalculation', '/concluderecalculation', '/editresearcher/:id', '/addresearcher'], routes)

// codes and clusters
app.get(['/managecodes', '/manageclusters'], routes)
app.post(['/addcode', '/removecode', '/manageclusters'], routes)

// tickets
app.get(['/tickets', '/ticket/:id'], routes)
app.post(['/addticket', '/ticket/:id', '/resolve', '/editticket', '/editreply', '/addreply'], routes)

// non-crucial features
app.get(['/profile'], routes)
app.post(['/changename', '/changepassword', '/deleteaccount', '/changexp', '/changerole', '/changematches'], routes)

app.get(['/user/:id'], routes)

// listen to port
app.listen(port, () => {
    console.log("Backend is listening on port 3000");
})