const path = require('path');                             // install path
const options = {root: path.join(__dirname, '../public')};// set options root
const db = require(path.join(__dirname, '../databases/postgres.js'))
var theuser;

// password hashing stuff
// password = MD5(x.password.trim() + salt).toString();
var MD5 = require("crypto-js/md5");
const salt = "SALT";
var userid = 0;

// passport authentication stuff
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

async function users_list() {
    // res = await db.query('SELECT * FROM users');
    // res = res.rows
    res = [
        {
            "id": 0,
            "name": "bigbossadmin",
            "password": "irule",
            "biography": "THE BIG BOSS"
        },
        {
            "id": 1,
            "name": "anotheruser",
            "password": "12345",
            "biography": "i wish i was the big boss :("
        }
    ]
    return res
}

// save initial url so after login it doesnt get lost
var urlinit = '/';

// templates
const partialfooter = `<footer style="margin: 0; padding: 1em; background-color: rgb(66, 37, 211); color: white; position: relative; bottom: 0; width: 100%;"><h2>The Footer</h2></footer>`

const headpartial = `<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🧪</text></svg>">
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

// more passport stuff for sessions
passport.use(new LocalStrategy(
    { usernameField: 'username' },
    async (username, password, done) => {
        console.log("LOCAL STRATEGY")
        users = await users_list();
        success = false;
        for (u in users) {
            user = users[u];
            if(username === user.name && password === user.password) {
                success = user
                break;
            }
        }
        if (success) {
            console.log("SUCCESS")
            userid = u;
            return done(null, success)
        } else {
            console.log("FAILURE")
            return done(null, false, { message: 'Invalid credentials.' });
        }
    }
));

passport.serializeUser((user, done) => {
    console.log("SERIALIZING")
    theuser = user;
    done(null, user.id);
});
  
passport.deserializeUser(async (id, done) => {
    console.log("DESERIALIZING")

    users = await users_list();
    const user = users[userid].id === id ? users[userid] : false; 
    done(null, user);
});

// Methods to be executed on routes 

const indexget = async (req, res)=>{
    console.log("INDEX GET")
    console.log(req.isAuthenticated())
    if (req.isAuthenticated()) {
        if (theuser == undefined) {
            userid = req.session.userid;
            users = await users_list();

            for (x in users) {
                if (x == userid) {
                    theuser = users[x];
                    break;
                }
            }
        }
        
        res.render('index.ejs', {root: path.join(__dirname, '../public'), head: headpartial, user: req.session.username, biography: theuser.biography, footer: partialfooter, message: "SUCCESSFUL AUTHENTICATION"});
    } else {
        res.redirect('/login')
    }
} 

const loginget = async (req, res)=>{
    console.log("LOGIN GET")

    if (req.isAuthenticated()) {
        res.redirect('/')
    } else {
        res.render('login.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooter, message: "NONE"});
    }
} 

const indexpost = (req, res, next) => {
    console.log("INDEX POST")
    req.session.destroy()
    return res.redirect('/login')
}

const loginpost = (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        console.log("LOGIN POST")
        if (info) {
            console.log("FAILURE")
            return res.render('login.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooter, message: info.message});
        }
        req.login(user, (err) => {
            console.log("SUCCESS")

            req.session.username = user.name;
            req.session.userid = user.id;

            return res.redirect(urlinit)
        })
    })(req, res, next);
}

// Export of all methods as object 
module.exports = { 
    indexget,
    indexpost,
    loginget,
    loginpost
}