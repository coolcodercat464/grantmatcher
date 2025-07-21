// setup
const express = require('express');                       // import express
const path = require('path');                             // install path
var nodemailer = require('nodemailer');                   // for sending emails
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

// ejs partial templates
// the html for footer (for code reuse) when logged in
const partialfooterLoggedIn = `
<footer style="margin: 0; padding: 1em; background-color: #272727; color: white; position: relative; bottom: 0; width: 100%;">
    <section>
        <div class="together">
            <h2><a href="/">GrantMatcher</a></h2>
            <p>"If we knew what we were doing, it would not be called research, would it?" - Albert Einstein</p>
        </div>
        <div class="together" style="justify-content: center;">
            <div><a href="/tickets">Tickets</a></div> 
            <div><a href="/profile">Profile</a></div> 
            <div><a href="/tutorial">Tutorial</a></div> 
            <div><a onclick="window.location.href = 'mailto:flyingbutter213@gmail.com?subject=Hello&body=Message'">Contact</a></div> 
        </div>
    </section>
</footer>
`

// the html for the header (for code reuse)
const headpartial = `
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🔬</text></svg>">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <link rel="stylesheet" href="/style.css">

    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js" integrity="sha384-IQsoLXl5PILFhosVNubq5LC7Qb9DXgDA9i+tQ8Zj3iwWAwPtgFTxbJ8NT4GN1R8p" crossorigin="anonymous"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.min.js" integrity="sha384-cVKIPhGWiC2Al4u+LWgxfKTRIcfu0JTxR+EQDz/bgldoEyl4H0zUF0QKbrJ0EcQF" crossorigin="anonymous"></script>
    
    <link href = "https://code.jquery.com/ui/1.10.4/themes/ui-lightness/jquery-ui.css" rel = "stylesheet">
    <script src = "https://code.jquery.com/jquery-1.10.2.js"></script>
    <script src = "https://code.jquery.com/ui/1.10.4/jquery-ui.js"></script>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
`

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
app.post(['/changename', '/changepassword', '/deleteaccount', '/changexp', '/changerole', '/changematches', '/suspend'], routes)

app.get(['/user/:id'], routes)

// error handling
app.use((err, req, res, next) => {
    // if you need to refresh the credentials, use: https://dev.to/chandrapantachhetri/sending-emails-securely-using-node-js-nodemailer-smtp-gmail-and-oauth2-g3a
    err = err.stack
    console.error('Express error:', err);

    // create transporter
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: process.env.MAIL_USERNAME,
          pass: process.env.MAIL_PASSWORD,
          clientId: process.env.OAUTH_CLIENTID,
          clientSecret: process.env.OAUTH_CLIENT_SECRET,
          refreshToken: process.env.OAUTH_REFRESH_TOKEN
        }
    });

    // the email info
    var mailOptions = {
        from: 'flyingbutter213@gmail.com',
        to: 'flyingbutter213@gmail.com',
        subject: '[URGENT] GRANT MATCHER ERROR AT ' + req.originalUrl,
        html: err
    };

    // emails flying butter when there is an error
    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });

    res.status(500).send({status: 'error', alert: 'Something went wrong. Please try again. If this problem persists, please email me at flyingbutter213@gmail.com.'});
});

// listen to port
app.listen(port, () => {
    console.log("Backend is listening on port 3000");
})