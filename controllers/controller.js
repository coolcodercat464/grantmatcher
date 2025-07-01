const path = require('path');                                // install path
const options = {root: path.join(__dirname, '../public')};   // set options (root)

// allow the backend to access the database
const db = require(path.join(__dirname, '../databases/postgres.js'))

// password hashing stuff
var MD5 = require("crypto-js/md5");

// passport authentication stuff
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

// get a list of dictionaries of users
async function users_list() {
    // JUSTIFICATION: this data structure is used as it is how
    // db.query() returns things as default, reducing processing
    // time. Additionally, it is easy to loop through the contents
    // of all the users.

    try {
        // get all user credentials
        res = await db.query('SELECT name, email, password FROM users');

        // res is a list of dictionaries
        res = res.rows
        
        return res
    } catch (err) {
        // if some error occurs, return an empty list and print out an error message
        console.error(err);
        return []
    }
}

// add the new user to the user list
async function save_user(newUser, role) {
    // get the user's details
    userName = newUser.name
    email = newUser.email

    // hash the password
    password = MD5(newUser.password.trim() + process.env.PASSWORD_SALT).toString();

    // get the current date
    now = new Date();

    // separate the parts of the date and ensure month and day are always two digits (e.g., 05 not 5)
    year = now.getFullYear()
    month = new Intl.DateTimeFormat('en', { month: '2-digit' }).format(now)
    day = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(now)

    // stringify it
    date = `${day}-${month}-${year}`

    // catch any errors
    try {
        // insert the user's data into the database
        const mq1 = 'INSERT INTO users (name, email, password, role, "grantsMatched", xp, "dateJoined", "colourTheme", "notificationPreferences", "versionInformation") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)'
        const result1 = await db.query(mq1, [userName, email, password, role, 0, 0, date, "light", false, [[]]]);
        
        // get all changes
        const mq2 = 'SELECT "changeID" FROM changelog'
        const result2 = await db.query(mq2);

        // calculate the maximum changeID
        maxChangeID = 0
        for (x in result2.rows) {
            rowID = result2.rows[x].changeID
            if (rowID > maxChangeID) {
                maxChangeID = rowID
            }
        }

        // calculate the next change ID
        nextChangeID = maxChangeID + 1

        // add 'user joined' change to changelog
        const mq3 = 'INSERT INTO changelog ("changeID", "userEmail", "type", date, description, "excludedFromView") VALUES ($1, $2, $3, $4, $5, $6)'
        const result3 = await db.query(mq3, [nextChangeID, email, 'User Joined', date, `${newUser.name} joined Grant Matcher! Please make them feel welcome!`, '{}']);
        
    } catch (err) {
        console.error(err);
    }
}

// get a list of dictionaries of users
async function get_codes() {
    // JUSTIFICATION: this data structure is used as it is how
    // db.query() returns things as default, reducing processing
    // time. Additionally, it is easy to loop through the contents
    // of all the codes.

    try {
        // get all codes
        res = await db.query('SELECT "userEmail", code, role FROM codes');

        // res is a list of dictionaries
        res = res.rows
        
        return res
    } catch (err) {
        // if some error occurs, return an empty list and print out an error message
        console.error(err);
        return []
    }
}

// find a user by their email
async function get_user_by_email(useremail) {
    // the user object (initially undefined)
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

// save this variable for if the user is new
var showAlertDashboard = "no"

// TEMPLATES

// the html for footer (for code reuse) when logged out
const partialfooterLoggedOut = `
<footer style="margin: 0; padding: 1em; background-color: #272727; color: white; position: relative; bottom: 0; width: 100%;">
    <section>
        <div class="together">
            <h2><a href="/">GrantMatcher</a></h2>
            <div class="spacer"></div>
            <p>"If we knew what we were doing, it would not be called research, would it?" - Albert Einstein</p>
        </div>
        <div class="together" style="justify-content: center;">
            <div><a href="/login">Login</a></div> 
            <div class="spacer"></div>
            <div><a href="/signup">Signup</a></div> 
            <div class="spacer"></div>
            <div><a href="/tutorial">Tutorial</a></div> 
            <div class="spacer"></div>
            <div><a onclick="window.location.href = 'mailto:flyingbutter213@gmail.com?subject=Hello&body=Message'">Contact</a></div> 
        </div>
    </section>
</footer>
`

// the html for footer (for code reuse) when logged in
const partialfooterLoggedIn = `
<footer style="margin: 0; padding: 1em; background-color: #272727; color: white; position: relative; bottom: 0; width: 100%;">
    <section>
        <div class="together">
            <h2><a href="/">GrantMatcher</a></h2>
            <div class="spacer"></div>
            <p>"If we knew what we were doing, it would not be called research, would it?" - Albert Einstein</p>
        </div>
        <div class="together" style="justify-content: center;">
            <div><a href="/tickets">Tickets</a></div> 
            <div class="spacer"></div>
            <div><a href="/profile">Profile</a></div> 
            <div class="spacer"></div>
            <div><a href="/tutorial">Tutorial</a></div> 
            <div class="spacer"></div>
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
            hashedPassword = MD5(password.trim() + process.env.PASSWORD_SALT).toString();
            if (email === user.email && hashedPassword === user.password) {
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

        if (theuser != undefined) {
            tempShow = showAlertDashboard // temporarily store the showAlertDashboard (as we need to set it to no)
            showAlertDashboard = "no"
            res.render('dashboard.ejs', {root: path.join(__dirname, '../public'), head: headpartial, user: theuser.name, footer: partialfooterLoggedIn, showAlert: tempShow});
        } else {
            req.session.destroy()
            res.redirect('/')
        }
    } else {
        res.render('landing.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedOut});
    }
} 

// present the login page
const loginget = async (req, res)=>{
    console.log("LOGIN GET")

    // only allow them to login if they havent been authenticated
    if (req.isAuthenticated()) {
        res.redirect('/')
    } else {
        res.render('login.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedOut, showAlert: 'no', urlinit: urlinit});
    }
} 

// present the signup page
const signupget = async (req, res)=>{
    console.log("SIGNUP GET")

    // only allow them to signup if they havent been authenticated yet
    if (req.isAuthenticated()) {
        res.redirect('/')
    } else {
        res.render('signup.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedOut, showAlert: 'no'});
    }
} 

// get route with input
const grantpageget = async (req, res)=>{
  console.log("GRANT PAGE GET")

  // get the id (from the route name itself)
  id = req.params.id
  console.log(id);
  
  // only allow them to access this page if they have been authenticated
  if (req.isAuthenticated()) {
    // get the grant data
    try {
        // get the grants data
        const mq = 'SELECT * FROM grants WHERE "grantID" = $1'
        const result = await db.query(mq, [id]);
        grant = result.rows
    } catch (err) {
        console.error(err);
        res.status(500).render('grantPage.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn, title: "Unknown Title", user: "unknown user", url: "unknown URL", deadline: "unknown deadline", duration: "unknown duration", clusters: "", id: id, keywords: "", description: "", researchers: "", showAlert: 'Something went wrong when fetching the data from our servers. Please try again.'});
    }

    if (grant.length == 0) {
        res.status(404).render('grantPage.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn, title: "Unknown Title", user: "unknown user", url: "unknown URL", deadline: "unknown deadline", duration: "unknown duration", clusters: "", id: id, keywords: "", description: "", researchers: "", showAlert: 'This grant does not exist yet. Maybe you can help make it by adding a grant!'});
        return
    } else {
        grant = grant[0]
    }
    
    // get the relevant fields
    url = grant.url
    deadline = grant.deadline
    duration = grant.duration
    clusters = grant.clusters.join(", ")
    description = grant.description
    keywords = grant.keywords.join("\n")
    researchers = grant.researchers.join("\n")

    // get the users name from their email
    userEmail = grant.userEmail
    user = await get_user_by_email(userEmail)

    // if the user doesnt exist, then they have been deleted
    if (user == undefined) { user = "deleted user"}
    else { user = user.name }

    res.render('grantPage.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn, title: grant.grantName, user: user, url: url, deadline: deadline, duration: duration, clusters: clusters, id: id, keywords: keywords, description: description, researchers: researchers, showAlert: 'no'});
  } else {
    urlinit = '/grant/' + id // redirect them to the current url after they logged in
    res.render('login.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedOut, showAlert: 'no', urlinit: urlinit});
  }
};

// present the add grant page
const addgrantget = async (req, res)=>{
    console.log("ADD GRANT GET")

    // only allow them to signup if they havent been authenticated yet
    if (req.isAuthenticated()) {
        res.render('addGrant.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn, showAlert: 'no'});
    } else {
        urlinit = '/addgrant' // redirect them to the current url after they logged in
        res.render('login.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedOut, showAlert: 'no', urlinit: urlinit});
    }
} 

// POST
// when user logs out
const indexpost = (req, res, next) => {
    console.log("INDEX POST")
    // destroy the session
    req.session.destroy()
    // send them page to the login page
    res.redirect('/login')
}

// when the user sumbits the login form, either redirect them to the dashboard if their
// credentials are correct, or give them an error-popup.
const loginpost = async (req, res, next) => {
    users = await users_list()

    // use passport to authenticate the user
    passport.authenticate('local', (err, user, info) => {
        console.log("LOGIN POST")

        // if there is a failure message, then it has failed
        if (info) {
            console.log("FAILURE")

            // showAlert is 'yes' to show an error alert
            return res.render('login.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedOut, showAlert: 'yes', urlinit: urlinit});
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

            res.send({"success":"success"})
        })
    })(req, res, next);
}

const signuppost = async (req, res, next) => {
    console.log('SIGNUP POST')

    // get the user inputs
    x = req.body;

    // get all the users
    users = await users_list();

    // check if the user is already in the database
    for (u in users) {
        user = users[u];
        if(req.body.email === user.email) {
            // give them an error pop-up if they are already in the database
            res.render('signup.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedOut, showAlert: 'A user with this email already exists. Please try again or login instead.'});
            return
        }
    }

    if(!req.body.email || !req.body.authcode || !req.body.password || !req.body.name){
        res.render('signup.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedOut, showAlert: 'Please ensure all fields are filled.'});
    } else {
        // get all the auth codes
        codes = await get_codes()

        // check whether the authentication code is correct
        success = false
        role = undefined
        for (x in codes) {
            code = codes[x]
            // check if the code matches the inputted email
            if (code.code == req.body.authcode && code.userEmail == req.body.email) {
                success = true;
                role = code.role;
                break
            }
        }

        // if it failed (no code exists), give an error pop-up to the user
        if (!success) {
            res.render('signup.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedOut, showAlert: 'Your authentication code seems to be incorrect. If you haven\'t been provided with one, please contact me at flyingbutter213@gmail.com. Please ensure your email has been spelt correctly.'});
            return
        }

        // new user object
        var newUser = {email: req.body.email, name: req.body.name, password: req.body.password};

        // add the user to the database
        await save_user(newUser, role);

        // authenticate the user
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

            // User is now authenticated. render dashboard with welcome message
            showAlertDashboard = "yes"
            res.send({"success":"success"})
        });
    }
}

// add a new grant
const addgrantpost = async (req, res)=>{
    console.log("ADD GRANT POST")

    // get the user inputs
    x = req.body

    // isolate each field
    grantName = x.name
    url = x.url
    description = x.description
    keywords = x.keywords

    // parse the dates
    dateSplit = x.deadline.split('-')
    reformattedDeadline = dateSplit[2] + '-' + dateSplit[1] + '-' + dateSplit[0]
    duration = parseFloat(x.duration)
    
    // the clusters list will contain two lists - one is a list of names and the
    // other is a list of element IDs (from the DOM)
    clustersElementId = x.clusters[1]
    clustersId = []

    // isolate the cluster IDs from the element ID list
    for (i in clustersElementId) {
        clustersId.push(parseInt(clustersElementId[i].split('S')[1]))
    }

    try {
        // get all grant IDs
        const mq2 = 'SELECT "grantID" FROM grants'
        const result2 = await db.query(mq2);

        // calculate the maximum grantID
        maxGrantID = 0
        for (x in result2.rows) {
            rowID = result2.rows[x].grantID
            if (rowID > maxGrantID) {
                maxGrantID = rowID
            }
        }
        // calculate the next change ID
        nextGrantID = maxGrantID + 1

        // add the grant to grants table
        const mq3 = 'INSERT INTO grants ("grantID", "userEmail", "grantName", url, deadline, duration, description, clusters, keywords, researchers, matched, "versionInformation") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)'
        const result3 = await db.query(mq3, [nextGrantID, req.session.useremail, grantName, url, reformattedDeadline, duration, description, clustersId, keywords, [], false, [[]]]);
        
        // redirect to the grant page
        res.redirect("/grant/" + nextGrantID)
    } catch (err) {
        console.error(err);

        // if an error occurs, tell the user
        res.render('addGrant.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn, showAlert: 'Something went wrong. Please ensure all of the inputs are valid. THis might be a server-side issue. If this problem persists, please open a ticket and I will get this fixed ASAP.'});
    }
} 

// Export of all methods as object 
module.exports = { 
    indexget,
    loginget,
    signupget,
    addgrantget,
    grantpageget,

    indexpost,
    loginpost,
    signuppost,
    addgrantpost,
}