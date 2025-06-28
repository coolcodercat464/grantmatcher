const path = require('path');                                // install path
const options = {root: path.join(__dirname, '../public')};   // set options root

// allow the backend to access the database
const db = require(path.join(__dirname, '../databases/postgres.js'))

// password hashing stuff
// SAMPLE CODE:
// password = MD5(x.password.trim() + salt).toString();
var MD5 = require("crypto-js/md5");
const salt = "SALT"; // add to a .env file

// passport authentication stuff
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

// JUSTIFICATION: this data structure is used as it is how
// db.query() returns things as default, reducing processing
// time. Additionally, it is easy to loop through the contents
// of all the users.
userList = [
    {
        "name": "Big Boss",
        "email": "bigbossadmin@company.com",
        "password": "irule",
        "xp": 55
    },
    {
        "name": "Employee",
        "email": "firstname.lastname@company.com",
        "password": "iwork",
        "xp": 25
    }
]

// get a list of dictionaries of users
async function users_list() {
    // TODO: Replace with database method
    // res = await db.query('SELECT field1, field2 FROM users');
    // res = res.rows
    
    return userList
}

// add the new user to the user list
async function save_user(newUser) {
    // TODO: Replace with database method
    /*
        try {
            const mq = 'INSERT INTO users (name, password, ...) VALUES ($1, $2, ...)'
            const result1 = await db.query(mq, [name, password, ...]);
            res.redirect(urlinit)
        } catch (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
        }
    */

    // new users have 0 xp initially
    newUser.xp = 0

    // add them to the list
    userList.push(newUser)
}

// find a user by their email
async function get_user_by_email(useremail) {
    // the user object
    theuser = undefined

    // get a list of users
    users = await users_list();

    // linear search to find the user with the email
    for (x in users) {
        if (users[x].email == useremail) {
            theuser = users[x];
            break;
        }
    }

    return theuser
}

// save initial url so after login it doesnt get lost
var urlinit = '/';

// TEMPLATES

// the html for footer (for code reuse)
const partialfooter = `
<footer style="margin: 0; padding: 1em; background-color: #272727; color: white; position: relative; bottom: 0; width: 100%;">
    <section>
        <div class="together">
            <h2>GrantMatcher</h2>
            <div class="spacer"></div>
            <p>"If we knew what we were doing, it would not be called research, would it?" - Albert Einstein</p>
        </div>
        <div class="together" style="justify-content: center;">
            <div><a>Login</a></div> 
            <div class="spacer"></div>
            <div><a>Signup</a></div> 
            <div class="spacer"></div>
            <div><a>Tutorial</a></div> 
            <div class="spacer"></div>
            <div><a>Contact</a></div> 
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

// more passport stuff for sessions
passport.use(new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
        console.log("LOCAL STRATEGY")

        // get all users
        users = await users_list();

        // check if the credentials are in the database
        success = false;
        for (u in users) {
            user = users[u];
            // email (primary key) and password must match
            if (email === user.email && password === user.password) {
                success = user
                break;
            }
        }

        // success or failure

        /*
        DONE: this is what passport uses to determine whether the 
        authentication was successful or not. done(null, user) is
        successful. done(null, false) is failure. Error is done(err).
        */
        if (success) {
            console.log("SUCCESS")
            return done(null, success)
        } else {
            console.log("FAILURE")
            return done(null, false, { message: 'Invalid credentials.' });
        }
    }
));

/*
SERIALISATION: This is about storing the user in the session.
done(null, soemthing) means that you store 'something' in the
session. This should be the primary key.
*/
passport.serializeUser((user, done) => {
  console.log("SERIALIZING");
  done(null, user.email);
});

/*
DESERIALISATION: This is how you go from the thing stored in
the session to the full user object.
*/
passport.deserializeUser(async (email, done) => {
  console.log("DESERIALIZING");

  // get the user object from the email
  user = await get_user_by_email(email)

  // check fi the user exists
  if (user) {
    done(null, user);
  } else {
    done(null, false);
  }
});

// Methods to be executed on routes 

// GET
// the home-page
const indexget = async (req, res)=>{
    console.log("INDEX GET")
    console.log(req.isAuthenticated())

    // dashboard if the user is signed-in, and landing page if they arent
    if (req.isAuthenticated()) {
        // find the user
        theuser = await get_user_by_email(req.session.useremail)
        console.log(theuser)
        // TODO: check if user exists
        res.render('index.ejs', {root: path.join(__dirname, '../public'), head: headpartial, user: theuser.name, footer: partialfooter});
    } else {
        res.render('landing.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooter});
    }
} 

// present the login page
const loginget = async (req, res)=>{
    console.log("LOGIN GET")

    // only allow them to login if they havent been authenticated
    if (req.isAuthenticated()) {
        res.redirect('/')
    } else {
        res.render('login.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooter, showAlert: 'no'});
    }
} 

// present the signup page
const signupget = async (req, res)=>{
    console.log("SIGNUP GET")

    // only allow them to signup if they havent been authenticated yet
    if (req.isAuthenticated()) {
        res.redirect('/')
    } else {
        res.render('signup.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooter, showAlert: 'no'});
    }
} 

// POST
// when user logs out
const indexpost = (req, res, next) => {
    console.log("INDEX POST")
    req.session.destroy()
    return res.redirect('/login')
}

// when the user sumbits the login form, either redirect them to the dashboard if their
// credentials are correct, or give them an error-popup.
const loginpost = (req, res, next) => {
    // use passport to authenticate the user
    passport.authenticate('local', (err, user, info) => {
        console.log("LOGIN POST")

        // if there is a failure message, then it has failed
        if (info) {
            console.log("FAILURE")

            // showAlert is 'yes' to show an error alert
            return res.render('login.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooter, showAlert: 'yes'});
        }

        // otherwise log them in
        req.login(user, (err) => {
            console.log("SUCCESS")

            // check if the rememberme checkbox is ticked
            if (req.body.rememberme) {
                // if so, remember them for 30 days
                req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30; // 30 days
                console.log("REMEMBERED");
            } else {
                // otherwise, just make it a regular cookie that will delete itself when the tab is closed
                // this might not work on all browsers since some of them keep the cookies
                delete req.session.cookie.expires;
                delete req.session.cookie.maxAge;
                console.log("NOT REMEMBERED");
            }

            // add information about the user to the cookie
            // so that it could be accessed later (for instance,
            // in the profile page, the app has to know who
            // the user is)
            req.session.useremail = user.email;

            return res.redirect(urlinit)
        })
    })(req, res, next);
}

const signuppost = async (req, res, next) => {
    console.log('SIGNUP POST')
    x = req.body;
    console.log(x)

    users = await users_list();
    console.log(users) // DEBUGGING ONLY PLEASE REMOVE

    // check if the user is already in the database
    for (u in users) {
        user = users[u];
        if(req.body.email === user.email) {
            res.render('signup.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooter, showAlert: 'A user with this email already exists. Please try again.'});
            return
        }
    }

    if(!req.body.email || !req.body.authcode || !req.body.password || !req.body.name){
        res.render('signup.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooter, showAlert: 'Please ensure all fields are filled.'});
    } else {
        //TODO: check if authentication code is correct
        var newUser = {email: req.body.email, name: req.body.name, password: req.body.password};

        await save_user(newUser);

        req.login(newUser, function(err) {
            if (err) { return next(err); }

            console.log("SUCCESS")

            // check if the rememberme checkbox is ticked
            if (req.body.rememberme) {
                // if so, remember them for 30 days
                req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30; // 30 days
                console.log("REMEMBERED");
            } else {
                // otherwise, just make it a regular cookie that will delete itself when the tab is closed
                // this might not work on all browsers since some of them keep the cookies
                delete req.session.cookie.expires;
                delete req.session.cookie.maxAge;
                console.log("NOT REMEMBERED");
            }

            // store the user in the cookie
            req.session.useremail = newUser.email;

            // User is now authenticated
            res.redirect('/');
        });
    }
}

// Export of all methods as object 
module.exports = { 
    indexget,
    loginget,
    signupget,

    indexpost,
    loginpost,
    signuppost,
}