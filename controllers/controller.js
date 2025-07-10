const path = require('path');                                // install path
const options = {root: path.join(__dirname, '../public')};   // set options (root)

// allow the backend to access the database
const db = require(path.join(__dirname, '../databases/postgres.js'))

// password hashing stuff
var MD5 = require("crypto-js/md5");

// passport authentication stuff
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

// check if a string is an integer
function isStringInteger(str) {
  const num = Number(str); 

  // to be a integer, the string cannot be nan and it miust be an integer
  return !isNaN(num) && Number.isInteger(num);
}

// get a list of dictionaries of users
async function users_list() {
    // JUSTIFICATION: this data structure is used as it is how
    // db.query() returns things as default, reducing processing
    // time. Additionally, it is easy to loop through the contents
    // of all the users.

    try {
        // get all user credentials
        res = await queryWithRetry('SELECT name, email, password FROM users');

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
        const result1 = await queryWithRetry(mq1, [userName, email, password, role, 0, 0, date, "light", false, []]);
        
        // get all changes
        const mq2 = 'SELECT "changeID" FROM changelog'
        const result2 = await queryWithRetry(mq2);

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
        const result3 = await queryWithRetry(mq3, [nextChangeID, email, 'User Joined', date, `${newUser.name} joined Grant Matcher! Please make them feel welcome!`, '{}']);
        
    } catch (err) {
        console.error(err);
    }
}

// query database with retry (in case of deadlock)
async function queryWithRetry(query, params=[], maxRetries=5) {
    let attempts = 0; // number of attempts so far

    while (attempts < maxRetries) {
        try {
            // try the query
            return await db.query(query, params);
        } catch (err) {
            // error code for deadlock is 40P01
            if (err.code === '40P01') {
                attempts++; // add attempts
                console.warn(`Deadlock detected. Retry ${attempts}/${maxRetries}`);

                // quit on maximum retries (5 by default)
                if (attempts === maxRetries) {
                    throw new Error('Max retries reached due to deadlock');
                }

                // wait a while
                const delay = Math.floor(Math.random() * 100) + 50 * attempts;
                await new Promise((resolve) => setTimeout(resolve, delay));
            } else {
                    // any other error should be rethrown (it isnt deadlock)
                    throw err;
            }
        }
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
        res = await queryWithRetry('SELECT "userEmail", code, role FROM codes');

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
        res.render('login.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedOut, urlinit: urlinit});
    }
} 

// present the signup page
const signupget = async (req, res)=>{
    console.log("SIGNUP GET")

    // only allow them to signup if they havent been authenticated yet
    if (req.isAuthenticated()) {
        res.redirect('/')
    } else {
        res.render('signup.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedOut});
    }
} 

// present the grant page
const grantpageget = async (req, res)=>{
  console.log("GRANT PAGE GET")

  // get the id (from the route name itself)
  id = req.params.id
  console.log(id);

  // add validation - ensure id is an integer (id might be 'script.js' sometimes)
  if (!isStringInteger(id) || parseInt(id) <= 0) {
    res.status(404).render('grantPage.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn, title: "Unknown Title", user: "unknown user", date: "unknown", url: "unknown URL", deadline: "unknown deadline", duration: "unknown duration", clusters: "", id: id, keywords: "", description: "", researchers: "", showAlert: 'Something went wrong when fetching the data from our servers. Please refresh the page and ensure that the URL path is typed in correctly. If the issue persists, please open a ticket to let me know.'});
    return
  }
  
  // only allow them to access this page if they have been authenticated
  if (req.isAuthenticated()) {
    // get the grant data
    try {
        // get the grants data
        const mq = 'SELECT * FROM grants WHERE "grantID" = $1'
        const result = await queryWithRetry(mq, [id]);
        grant = result.rows
    } catch (err) {
        console.error(err);
        res.status(500).render('grantPage.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn, title: "Unknown Title", user: "unknown user", date: "unknown", url: "unknown URL", deadline: "unknown deadline", duration: "unknown duration", clusters: "", id: id, keywords: "", description: "", researchers: "", showAlert: 'Something went wrong when fetching the data from our servers. Please try again.'});
    }

    if (grant.length == 0) {
        res.status(404).render('grantPage.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn, title: "Unknown Title", user: "unknown user", date: "unknown", url: "unknown URL", deadline: "unknown deadline", duration: "unknown duration", clusters: "", id: id, keywords: "", description: "", researchers: "", showAlert: 'This grant does not exist yet. Maybe you can help make it by adding a grant!'});
        return
    } else {
        grant = grant[0]
    }
    
    // get the relevant fields
    title = grant.grantName
    url = grant.url
    deadline = grant.deadline
    duration = grant.duration
    clusters = grant.clusters.join(", ")
    description = grant.description
    keywords = grant.keywords.join("\n")
    researchers = grant.researchers.join("\n")
    dateAdded = grant.dateAdded
    matched = grant.matched

    // get the users name from their email
    userEmail = grant.userEmail
    user = await get_user_by_email(userEmail)

    // if the user doesnt exist, then they have been deleted
    if (user == undefined) { user = "deleted user"}
    else { user = user.name }

    res.render('grantPage.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn, id: id, title: title, user: user, matched: matched, date: dateAdded, url: url, deadline: deadline, duration: duration, clusters: clusters, id: id, keywords: keywords, description: description, researchers: researchers, showAlert: 'no'});
  } else {
    urlinit = '/grant/' + id // redirect them to the current url after they logged in
    res.render('login.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedOut, showAlert: 'no', urlinit: urlinit});
  }
};

// present the add grant page
const addgrantget = async (req, res)=>{
    console.log("ADD GRANT GET")

    // only allow them to add grants if they havent been authenticated yet
    if (req.isAuthenticated()) {
        res.render('addGrant.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn});
    } else {
        urlinit = '/addgrant' // redirect them to the current url after they logged in
        res.render('login.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedOut, urlinit: urlinit});
    }
} 

// present the edit grant page
const editgrantget = async (req, res)=>{
    console.log("EDIT GRANT GET")
    id = req.params.id
    console.log(id)

    // add validation - ensure id is an integer (id might be 'script.js' sometimes)
    if (!isStringInteger(id) && id > 0) {
        res.status(404).render('grantPage.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn, title: "Unknown Title", user: "unknown user", date: "unknown", url: "unknown URL", deadline: "unknown deadline", duration: "unknown duration", clusters: "", id: id, keywords: "", description: "", researchers: "", showAlert: 'Something went wrong when fetching the data from our servers. Please refresh the page and ensure that the URL path is typed in correctly. If the issue persists, please open a ticket to let me know.'});
        return
    }

    // only allow them to signup if they havent been authenticated yet
    if (req.isAuthenticated()) {
        id = parseInt(id)

        try {
            // get the grants data
            const mq = 'SELECT * FROM grants WHERE "grantID" = $1'
            const result = await queryWithRetry(mq, [id]);
            grant = result.rows
        } catch (err) {
            console.error(err);
            res.status(500).render('grantPage.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn, title: "Unknown Title", user: "unknown user", date: "unknown", url: "unknown URL", deadline: "unknown deadline", duration: "unknown duration", clusters: "", id: id, keywords: "", description: "", researchers: "", showAlert: 'Something went wrong when fetching the data from our servers. Please try again.'});
            return
        }

        if (grant.length == 0) {
            res.status(404).render('grantPage.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn, title: "Unknown Title", user: "unknown user", date: "unknown", url: "unknown URL", deadline: "unknown deadline", duration: "unknown duration", clusters: "", id: id, keywords: "", description: "", researchers: "", showAlert: 'This grant does not exist yet. Maybe you can help make it by adding a grant!'});
            return
        } else {
            grant = grant[0]
        }
        
        // get the relevant fields
        title = grant.grantName
        url = grant.url
        duration = grant.duration
        description = grant.description

        // join the lists
        clusters = grant.clusters.join(", ")
        keywords = grant.keywords.join("\n")
        researchers = grant.researchers.join("\n")

        // reformat deadline
        deadline = grant.deadline
        dateSplit = deadline.split('-')
        deadline = dateSplit[2] + '-' + dateSplit[1] + '-' + dateSplit[0]

        res.render('editGrant.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn, id: id, title: title, url: url, deadline: deadline, duration: duration, clusters: clusters, description: description, keywords: keywords, researchers: researchers, showAlert: 'no'});
    } else {
        urlinit = '/editgrant/' + id // redirect them to the current url after they logged in
        res.render('login.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedOut, urlinit: urlinit});
    }
} 

// present the match grant page
const matchget = async (req, res)=>{
    console.log("MATCH GET")

    // get the id (from the route name itself)
    id = req.params.id
    console.log(id);

    // add validation - ensure id is an integer (id might be 'script.js' sometimes)
    if (!isStringInteger(id) || parseInt(id) < 0) {
        res.status(404).render('grantPage.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn, title: "Unknown Title", user: "unknown user", date: "unknown", url: "unknown URL", deadline: "unknown deadline", duration: "unknown duration", clusters: "", id: id, keywords: "", description: "", researchers: "", showAlert: 'Something went wrong when fetching the data from our servers. Please refresh the page and ensure that the URL path is typed in correctly. If the issue persists, please open a ticket to let me know.'});
        return
    }
    
    // only allow them to access this page if they have been authenticated
    if (req.isAuthenticated()) {
        // get the grant data
        try {
            // get the grants data
            const mq = 'SELECT * FROM grants WHERE "grantID" = $1'
            const result = await queryWithRetry(mq, [id]);
            grant = result.rows
        } catch (err) {
            console.error(err);
            res.status(500).render('grantPage.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn, title: "Unknown Title", user: "unknown user", date: "unknown", url: "unknown URL", deadline: "unknown deadline", duration: "unknown duration", clusters: "", id: id, keywords: "", description: "", researchers: "", showAlert: 'Something went wrong when fetching the data from our servers. Please try again.'});
        }

        // 404 if no grant is found
        if (grant.length == 0) {
            res.status(404).render('grantPage.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn, title: "Unknown Title", user: "unknown user", date: "unknown", url: "unknown URL", deadline: "unknown deadline", duration: "unknown duration", clusters: "", id: id, keywords: "", description: "", researchers: "", showAlert: 'This grant does not exist yet. Maybe you can help make it by adding a grant!'});
            return
        } else {
            grant = grant[0]
        }
        
        // get the relevant fields
        title = grant.grantName
        url = grant.url
        deadline = grant.deadline
        duration = grant.duration
        clusters = grant.clusters.join(", ")
        description = grant.description
        keywords = grant.keywords.join("\n")
        researchers = grant.researchers.join("\n")
        dateAdded = grant.dateAdded

        // get the users name from their email
        userEmail = grant.userEmail
        user = await get_user_by_email(userEmail)

        // if the user doesnt exist, then they have been deleted
        if (user == undefined) { user = "deleted user"}
        else { user = user.name }

        res.render('match.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn, id: id, title: title, user: user, date: dateAdded, url: url, deadline: deadline, duration: duration, clusters: clusters, id: id, keywords: keywords, description: description, researchers: researchers, showAlert: 'no'});
    } else {
        urlinit = '/grant/' + id // redirect them to the current url after they logged in
        res.render('login.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedOut, showAlert: 'no', urlinit: urlinit});
    }
};

// get the recalculation page
const recalculateget = async (req, res) => {
    // only allow them to signup if they have already been authenticated
    if (req.isAuthenticated()) {
        res.render('recalculate.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn});
    } else {
        urlinit = '/recalculate'
        res.redirect('/login')
    }
}

// present the manage codes page
const managecodesget = async (req, res)=>{
    console.log("MANAGE CODES GET")

    // TODO: ensure the role is correct
    // only allow them to manage codes if they havent been authenticated yet
    if (req.isAuthenticated()) {
        res.render('manageCodes.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn});
    } else {
        urlinit = '/managecodes' // redirect them to the current url after they logged in
        res.render('login.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedOut, urlinit: urlinit});
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

            res.send({"success":"failure"})
            return
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
            req.session.username = user.name;

            res.send({"success":"success"})
        })
    })(req, res, next);
}

// when the user signs up
const signuppost = async (req, res, next) => {
    console.log('SIGNUP POST')

    try {
        // get the user inputs
        x = req.body;

        // ensure that all the fields are there
        if (!x.name || !x.password || !x.email || !x.authcode || !x.rememberme) {
            // give them an error pop-up
            res.send({alert: 'Please ensure all fields are filled.'});
            return
        }

        // add validation to name - name cannot just be spaced
        if (x.name.trim() === '') {
            // give them an error pop-up
            res.send({alert: 'Please ensure your name isn\'t empty!'});
            return
        } 

        // add validation to password - password must be at least 5 characters
        if (x.password.length < 5) {
            // give them an error pop-up
            res.send({alert: 'Your password must be at least 5 characters long. Please try again!'});
            return
        } 

        // get all the users
        users = await users_list();

        // check if the user is already in the database
        for (u in users) {
            user = users[u];
            if(x.email === user.email) {
                // give them an error pop-up if they are already in the database
                res.send({alert: 'A user with this email already exists. Please try again or login instead.'});
                return
            }
        }

        // get all the auth codes
        codes = await get_codes()

        // check whether the authentication code is correct
        success = false
        role = undefined
        for (i in codes) {
            code = codes[i]
            // check if the code matches the inputted email
            if (code.code == x.authcode && code.userEmail == x.email) {
                success = true;
                role = code.role;
                break
            }
        }

        // if it failed (no code exists), give an error pop-up to the user
        if (!success) {
            res.send({alert: 'Your authentication code seems to be incorrect. If you haven\'t been provided with one, please contact me at flyingbutter213@gmail.com. Please ensure your email has been spelt correctly.'});
            return
        }

        // new user object
        var newUser = {email: x.email, name: x.name, password: x.password};

        // add the user to the database
        await save_user(newUser, role);

        // authenticate the user
        req.login(newUser, function(err) {
            if (err) { return next(err); }

            console.log("SUCCESS")

            // check if the rememberme checkbox is ticked
            if (x.rememberme) {
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
            req.session.username = newUser.name;

            // User is now authenticated. render dashboard with welcome message
            showAlertDashboard = "yes"
            res.send({"success":"success"})
        });
    } catch (err) {
        console.log(err)
        res.send({alert: "Something went wrong when signing you up. If this issue persists, please let me know."})
    }
}

// add a new grant
const addgrantpost = async (req, res)=>{
    console.log("ADD GRANT POST")

    // get the user inputs
    x = req.body

    // ensure that user is authenticated
    if (req.isAuthenticated() == false) {
        res.send({alert: 'Please login first :)'});
        return
    }

    // validation (will error out if the fields arent in the correct format, thus invalid inputs are handled in the catch part)
    try {
        // isolate each field
        grantName = x.name
        url = x.url
        description = x.description
        keywords = x.keywords
        deadline = x.deadline

        if (grantName == undefined || url == undefined || description == undefined || keywords == undefined || deadline == undefined || new Date(deadline) == 'Invalid Date') {
            res.send({alert: 'Some entries appear to be missing. Please try again.'});
            return
        }

        // parse the dates
        dateSplit = deadline.split('-')
        reformattedDeadline = dateSplit[2] + '-' + dateSplit[1] + '-' + dateSplit[0]

        // parse the duration
        duration = parseFloat(x.duration)

        if (duration <= 0) {
            res.send({alert: 'Duration must be positive. Please try again.'});
            return
        }
        
        // the clusters list will contain two lists - one is a list of names and the
        // other is a list of element IDs (from the DOM)
        clustersElementId = x.clusters[1]
        clustersId = []

        // isolate the cluster IDs from the element ID list
        for (i in clustersElementId) {
            clusterID = clustersElementId[i].split('S')[1]
            if (isStringInteger(clusterID) == false || parseInt(clusterID) < 0) {
                res.send({alert: 'Your clusters are invalid. Please refresh the page and try again.'});
                return
            }
            clustersId.push(parseInt(clusterID))
        }
    } catch (err) {
        console.error(err);

        // if an error occurs, tell the user
        res.send({alert: 'Something went wrong. Please ensure all of the inputs are valid. If this problem persists, please open a ticket and I will get this fixed ASAP.'});
        return
    }

    try {
        // get all grant IDs
        const mq1 = 'SELECT "grantID" FROM grants'
        const result1 = await queryWithRetry(mq1);

        // calculate the maximum grantID
        maxGrantID = 0
        for (x in result1.rows) {
            rowID = result1.rows[x].grantID
            if (rowID > maxGrantID) {
                maxGrantID = rowID
            }
        }
        // calculate the next change ID
        nextGrantID = maxGrantID + 1

        // get the current date
        now = new Date();

        // separate the parts of the date and ensure month and day are always two digits (e.g., 05 not 5)
        year = now.getFullYear()
        month = new Intl.DateTimeFormat('en', { month: '2-digit' }).format(now)
        day = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(now)

        // stringify it
        date = `${day}-${month}-${year}`

        // add the grant to grants table
        const mq2 = 'INSERT INTO grants ("grantID", "userEmail", "grantName", url, deadline, duration, description, clusters, keywords, researchers, matched, "dateAdded", "versionInformation") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)'
        const result2 = await queryWithRetry(mq2, [nextGrantID, req.session.useremail, grantName, url, reformattedDeadline, duration, description, clustersId, keywords, [[]], false, date, []]);
        
        // get all changes
        const mq3 = 'SELECT "changeID" FROM changelog'
        const result3 = await queryWithRetry(mq3);

        // calculate the maximum changeID
        maxChangeID = 0
        for (x in result3.rows) {
            rowID = result3.rows[x].changeID
            if (rowID > maxChangeID) {
                maxChangeID = rowID
            }
        }

        // calculate the next change ID
        nextChangeID = maxChangeID + 1

        // add 'grant added' change to changelog
        const mq4 = 'INSERT INTO changelog ("changeID", "userEmail", "type", date, description, "excludedFromView") VALUES ($1, $2, $3, $4, $5, $6)'
        const result4 = await queryWithRetry(mq4, [nextChangeID, req.session.useremail, 'Grant Added', date, `The grant "${grantName}" has been added. Check it out now!`, '{}']);

        // redirect to the grant page
        res.send({"id": nextGrantID})
    } catch (err) {
        console.error(err);

        // if an error occurs, tell the user
        res.send({alert: 'Something went wrong. Please ensure all of the inputs are valid. This might be a server-side issue. If this problem persists, please open a ticket and I will get this fixed ASAP.'});
    }
} 

// edit a grant
const editgrantpost = async (req, res)=>{
    console.log("EDIT GRANT POST")

    // ensure that user is authenticated
    if (req.isAuthenticated() == false) {
        res.send({alert: 'Please login first :)'});
        return
    }

    // get the id (from the route name itself)
    id = req.params.id
    console.log(id);

    // add validation - ensure id is an integer (id might be 'script.js' sometimes)
    if (!isStringInteger(id) || parseInt(id) <= 0) {
        res.status(404).render('grantPage.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn, title: "Unknown Title", user: "unknown user", date: "unknown", url: "unknown URL", deadline: "unknown deadline", duration: "unknown duration", clusters: "", id: id, keywords: "", description: "", researchers: "", showAlert: 'Something went wrong when fetching the data from our servers. Please refresh the page and ensure that the URL path is typed in correctly. If the issue persists, please open a ticket to let me know.'});
        return
    }

    try {
        // get the user inputs
        x = req.body

        // isolate each field
        grantName = x.name
        url = x.url
        description = x.description
        deadline = x.deadline
        keywords = x.keywords
        researchers = x.researchers
        reason = x.reason

        if (grantName == undefined || url == undefined || description == undefined || keywords == undefined || deadline == undefined || new Date(deadline) == 'Invalid Date' || reason == undefined || reason.trim() == '') {
            res.send({alert: 'Some entries appear to be missing. Please try again.'});
            return
        }

        // parse the dates
        dateSplit = deadline.split('-')
        reformattedDeadline = dateSplit[2] + '-' + dateSplit[1] + '-' + dateSplit[0]

        // parse the duration
        duration = parseFloat(x.duration)

        if (duration < 0) {
            res.send({alert: 'Duration must be positive. Please try again.'});
            return
        }
        
        // the clusters list will contain two lists - one is a list of names and the
        // other is a list of element IDs (from the DOM)
        clustersElementId = x.clusters[1]
        clustersId = []

        // isolate the cluster IDs from the element ID list
        for (i in clustersElementId) {
            clusterID = clustersElementId[i].split('S')[1]
            if (isStringInteger(clusterID) == false || parseInt(clusterID) < 0) {
                res.send({alert: 'Your clusters are invalid. Please refresh the page and try again.'});
                return
            }
            clustersId.push(parseInt(clusterID))
        }
    } catch (err) {
        console.error(err);

        // if an error occurs, tell the user
        res.send({alert: 'Something went wrong. Please ensure all of the inputs are valid. If this problem persists, please open a ticket and I will get this fixed ASAP.'});
        return
    }

    try {
        // get the grant information (to make versionInformation)
        const mq1 = 'SELECT * FROM grants WHERE "grantID" = $1'
        const result1 = await queryWithRetry(mq1, [id]);

        // ensure that the grant exists
        if (result1.rows.length == 0) {
            res.send({alert: 'Something went wrong and we couldn\'t find the grant you were trying to edit. Please check that it exists. If this problem persists, please open a ticket and I will get this fixed ASAP.'});
            return
        }
        grant = result1.rows[0]

        // get the previous version
        previousVersion = [grant.grantName, grant.url, grant.deadline, grant.duration.toString(), grant.description, grant.clusters.join(", "), grant.keywords.join("\n"), grant.researchers.join("\n"), grant.matched.toString(), reason]

        // get the current date (when this version stopped being the most recent version)
        now = new Date();

        // separate the parts of the date and ensure month and day are always two digits (e.g., 05 not 5)
        year = now.getFullYear()
        month = new Intl.DateTimeFormat('en', { month: '2-digit' }).format(now)
        day = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(now)

        // stringify it
        date = `${day}-${month}-${year}`

        // add it to the list
        previousVersion.push(date)

        // add the user to the version history list
        previousVersion.push(req.session.useremail)
        previousVersion.push(req.session.username)

        // add it to the version information list
        versionInformation = grant.versionInformation
        versionInformation.push(previousVersion)
        console.log(researchers)

        // add the grant to grants table
        const mq2 = 'UPDATE grants SET "grantName" = $1, url = $2, deadline = $3, duration = $4, description = $5, clusters = $6, keywords = $7, researchers = $8, "versionInformation" = $9 WHERE "grantID" = $10;'
        const result2 = await queryWithRetry(mq2, [grantName, url, reformattedDeadline, duration, description, clustersId, keywords, researchers, versionInformation, id]);
        
        // get all changes
        const mq3 = 'SELECT "changeID" FROM changelog'
        const result3 = await queryWithRetry(mq3);

        // calculate the maximum changeID
        maxChangeID = 0
        for (x in result3.rows) {
            rowID = result3.rows[x].changeID
            if (rowID > maxChangeID) {
                maxChangeID = rowID
            }
        }

        // calculate the next change ID
        nextChangeID = maxChangeID + 1

        // add 'grant edited' change to changelog
        const mq4 = 'INSERT INTO changelog ("changeID", "userEmail", "type", date, description, "excludedFromView") VALUES ($1, $2, $3, $4, $5, $6)'
        const result4 = await queryWithRetry(mq4, [nextChangeID, req.session.useremail, 'Grant Edited', date, `The grant "${grantName}" has been edited. Check it out now!`, '{}']);

        // redirect to the grant page
        res.send({"id": id})
    } catch (err) {
        console.error(err);

        // if an error occurs, tell the user
        res.send({alert: 'Something went wrong. Please ensure all of the inputs are valid. This might be a server-side issue. If this problem persists, please open a ticket and I will get this fixed ASAP.'});
    }
}

// delete a grant
const deletegrantpost = async (req, res)=>{
    console.log("DELETE GRANT POST")

    // ensure that user is authenticated
    if (req.isAuthenticated() == false) {
        res.send({alert: 'Please login first :)'});
        return
    }

    // get the id (from the route name itself)
    id = req.params.id
    console.log(id);

    // add validation - ensure id is an integer (id might be 'script.js' sometimes)
    if (!isStringInteger(id) || parseInt(id) <= 0) {
        res.status(404).render('grantPage.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn, title: "Unknown Title", user: "unknown user", date: "unknown", url: "unknown URL", deadline: "unknown deadline", duration: "unknown duration", clusters: "", id: id, keywords: "", description: "", researchers: "", showAlert: 'Something went wrong when fetching the data from our servers. Please refresh the page and ensure that the URL path is typed in correctly. If the issue persists, please open a ticket to let me know.'});
        return
    }

    x = req.body

    // ensure that reason is provided
    if (!x.reason) {
        res.send({alert: 'It looks like no reason for grant deletion was provided. Please try again.'});
        return
    }

    try {
        // get the grants name
        const mq1 =  'SELECT "grantName" FROM grants WHERE "grantID" = $1'
        const result1 = await queryWithRetry(mq1, [id]);

        if (result1.rows.length == 0) {
            res.send({alert: 'Looks like your grant doesn\'t exist in the first place! Please try again.'})
            return
        }
        
        grantName = result1.rows[0].grantName

        // remove the grant from the database
        const mq2 = 'DELETE FROM grants WHERE "grantID" = $1'
        const result2 = await queryWithRetry(mq2, [id]);

        // get the current date (when this version stopped being the most recent version)
        now = new Date();

        // separate the parts of the date and ensure month and day are always two digits (e.g., 05 not 5)
        year = now.getFullYear()
        month = new Intl.DateTimeFormat('en', { month: '2-digit' }).format(now)
        day = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(now)

        // stringify it
        date = `${day}-${month}-${year}`
        
        // get all changes
        const mq3 = 'SELECT "changeID" FROM changelog'
        const result3 = await queryWithRetry(mq3);

        // calculate the maximum changeID
        maxChangeID = 0
        for (x in result3.rows) {
            rowID = result3.rows[x].changeID
            if (rowID > maxChangeID) {
                maxChangeID = rowID
            }
        }

        // calculate the next change ID
        nextChangeID = maxChangeID + 1

        // add 'grant edited' change to changelog
        const mq4 = 'INSERT INTO changelog ("changeID", "userEmail", "type", date, description, "excludedFromView") VALUES ($1, $2, $3, $4, $5, $6)'
        const result4 = await queryWithRetry(mq4, [nextChangeID, req.session.useremail, 'Grant Deleted', date, `The grant "${grantName}" has been deleted. The reason provided was "${x.reason}"`, '{}']);

        res.send({success: 'success'})
    } catch (err) {
        console.log(err)

        res.send({alert: 'Something went wrong. Please ensure all of the inputs are valid. This might be a server-side issue. If this problem persists, please open a ticket and I will get this fixed ASAP.'});
    }
} 

// after a grant has been matched, update the database
const confirmmatchpost = async (req, res)=>{
    console.log("CONFIRM MATCH POST")

    // ensure that user is authenticated
    if (req.isAuthenticated() == false) {
        res.send({alert: 'Please login first :)'});
        return
    }

    // get the id (from the route name itself)
    id = req.params.id
    console.log(id);

    // add validation - ensure id is an integer (id might be 'script.js' sometimes)
    if (!isStringInteger(id) || parseInt(id) <= 0) {
        res.status(404).render('grantPage.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn, title: "Unknown Title", user: "unknown user", date: "unknown", url: "unknown URL", deadline: "unknown deadline", duration: "unknown duration", clusters: "", id: id, keywords: "", description: "", researchers: "", showAlert: 'Something went wrong when fetching the data from our servers. Please refresh the page and ensure that the URL path is typed in correctly. If the issue persists, please open a ticket to let me know.'});
        return
    }

    x = req.body
    console.log(x)

    // ensure that researcher names and emails are provided
    if (!x.researchersNames || !x.researchersEmails) {
        res.send({alert: 'It looks like no researchers were selected. Please try again.'});
        return
    }

    try {
        // get the researchers
        researchers = x.researchersNames.join(", ")
        researchersEmails = x.researchersEmails

        // get the grants name
        const mq1 =  'SELECT * FROM grants WHERE "grantID" = $1'
        const result1 = await queryWithRetry(mq1, [id]);

        if (result1.rows.length == 0) {
            res.send({alert: 'Looks like your grant doesn\'t exist in the first place! Please try again.'})
            return
        }

        grant = result1.rows[0]

        // get the previous version
        previousVersion = [grant.grantName, grant.url, grant.deadline, grant.duration.toString(), grant.description, grant.clusters.join(", "), grant.keywords.join("\n"), grant.researchers.join("\n"), grant.matched.toString(), "This grant has been matched."]

        grantName = grant.grantName

        // get the current xp
        const mq2 = 'SELECT xp FROM users WHERE email = $1'
        const result2 = await queryWithRetry(mq2, [req.session.useremail]);

        if (result2.rows.length == 0) {
            res.send({alert: 'Something went wrong when getting your XP and account details. If the issue persists, please let me know.'})
            return
        }

        // otherwise, add 5 to the xp
        currentXp = result2.rows[0].xp
        const mq3 = 'UPDATE users SET xp = $1 WHERE email = $2'
        const result3 = await queryWithRetry(mq3, [currentXp + 5, req.session.useremail]);

        // get the current date
        now = new Date();

        // separate the parts of the date and ensure month and day are always two digits (e.g., 05 not 5)
        year = now.getFullYear()
        month = new Intl.DateTimeFormat('en', { month: '2-digit' }).format(now)
        day = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(now)

        // stringify it
        date = `${day}-${month}-${year}`
        
        // get all changes
        const mq4 = 'SELECT "changeID" FROM changelog'
        const result4 = await queryWithRetry(mq4);

        // calculate the maximum changeID
        maxChangeID = 0
        for (x in result4.rows) {
            rowID = result4.rows[x].changeID
            if (rowID > maxChangeID) {
                maxChangeID = rowID
            }
        }

        // calculate the next change ID
        nextChangeID = maxChangeID + 1

        // add 'grant edited' change to changelog
        const mq5 = 'INSERT INTO changelog ("changeID", "userEmail", "type", date, description, "excludedFromView") VALUES ($1, $2, $3, $4, $5, $6)'
        const result5 = await queryWithRetry(mq5, [nextChangeID, req.session.useremail, 'Grant Matched', date, `The grant "${grantName}" has been matched. The researchers notified were ${researchers}.`, '{}']);

        // update the grant
        console.log(researchersEmails)

        // add the date to the verion history list
        previousVersion.push(date)

        // add the users name to the version history list
        previousVersion.push(req.session.useremail)
        previousVersion.push(req.session.username)

        // add it to the version information list
        versionInformation = grant.versionInformation
        versionInformation.push(previousVersion)
        console.log(researchers)

        const mq6 =  'UPDATE grants SET matched = true, researchers = researchers || $1, "versionInformation" = $2 WHERE "grantID" = $3;'
        const result6 = await queryWithRetry(mq6, [researchersEmails, versionInformation, id]);

        res.send({success: 'success'})
    } catch (err) {
        console.log(err)

        res.send({alert: 'Something went wrong. Please ensure all of the inputs are valid. This might be a server-side issue. If this problem persists, please open a ticket and I will get this fixed ASAP.'});
    }
} 

// add some clusters to the database (after recalculation)
const addclusterspost = async (req, res)=>{
    console.log("ADD CLUSTERS POST")

    // ensure that user is authenticated
    if (req.isAuthenticated() == false) {
        res.send({alert: 'Please login first :)'});
        return
    }

    x = req.body

    // ensure that clusters are provided
    if (!x.generatedClusters || x.generatedClusters == []) {
        res.send({alert: 'It looks like no clusters were selected. Please try again.'});
        return
    }

    try {
         // get all clusters
        const mq = 'SELECT "clusterID" FROM clusters'
        const result = await queryWithRetry(mq);

        // calculate the maximum clusterID
        maxClusterID = 0
        for (i in result.rows) {
            rowID = result.rows[i].clusterID
            if (rowID > maxClusterID) {
                maxClusterID = rowID
            }
        }

        // add each cluster to the database
        for (i in x.generatedClusters) {
            clusterName = x.generatedClusters[i]

            // add the cluster to the database
            await queryWithRetry('INSERT INTO clusters ("clusterID", name, description) VALUES ($1, $2, $3)', [maxClusterID+1, clusterName, "No description for this cluster yet."]);
            
            // update cluster ID
            maxClusterID += 1
        }

        res.send({success: 'success'})
    } catch (err) {
        console.log(err)

        res.send({alert: 'Something went wrong. Please ensure all of the inputs are valid. This might be a server-side issue. If this problem persists, please open a ticket and I will get this fixed ASAP.'});
    }
} 

// after the researchers have been recalculated, update the database
const confirmrecalculationpost = async (req, res)=>{
    console.log("CONFIRM RECALCULATION POST")

    // ensure that user is authenticated
    if (req.isAuthenticated() == false) {
        res.send({alert: 'Please login first :)'});
        return
    }

    x = req.body

    // ensure that researcher is provided
    if (!x.researcher || x.researcher == {}) {
        res.send({alert: 'It looks like no researchers were selected. Please try again.'});
        return
    }

    try {
        // get the current date
        now = new Date();

        // separate the parts of the date and ensure month and day are always two digits (e.g., 05 not 5)
        year = now.getFullYear()
        month = new Intl.DateTimeFormat('en', { month: '2-digit' }).format(now)
        day = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(now)

        // stringify it
        date = `${day}-${month}-${year}`

        // get all researcher data
        const mq1 =  'SELECT * FROM researchers'
        const result1 = await queryWithRetry(mq1);
        rows = result1.rows

        /* 
        DATA STRUCTURE JUSTIFICATION - Dictionary of Dictionaries:
        allResearchers is a dictionary of dictionaries. This allows the program
        to easily access the researchers information without another for-loop,
        improving efficiency and the cleanness of the code.
        */

        // get all researchers
        allResearchers = {} // maps email to researcher data
        
        for (r in rows) {
            row = rows[r]
            allResearchers[row['email']] = row
        }

        /* 
        DATA STRUCTURE JUSTIFICATION - Dictionary:
        clusterDictionary is a dictionary. This allows the program to easily
        access the cluster ID based on the cluster name, without using a nested
        for-loop (which is O(n^2), very bad). This improves efficiency by getting
        all the necessary calculations done in one go.
        */
        clusterDictionary = {} // maps cluster name to ID

        // get all clusters
        const mq = 'SELECT * FROM clusters'
        const result = await queryWithRetry(mq);

        // map the cluster name to ID
        for (i in result.rows) {
            clusterDictionary[result.rows[i].name] = result.rows[i].clusterID
        }

        researcher = x.researcher
    
        // get the researcher's details
        researcherName = researcher.name
        researcherEmail = researcher.email
        researcherSchool = researcher.school
        researcherGender = researcher.gender
        researcherCds = researcher.cds
        researcherActivity = researcher.activity
        researcherGrantKW = researcher.grant_keywords
        researcherGrant = researcher.grants
        researcherKW = researcher.keywords
        researcherProfile = researcher.profile
        researcherPub = researcher.pubs
        researcherPubKW = researcher.pubs_keywords
        researcherCluster = researcher.clusters

        /* 
        DATA STRUCTURE JUSTIFICATION - Dictionary:
        newResearcher is a dictionary. This allows the program to easily access 
        the researchers information without another for-loop, improving efficiency 
        and the cleanness of the code.
        */
        newResearcher = {
            'name':researcherName,
            'email':researcherEmail,
            'school':researcherSchool,
            'gender':researcherGender,
            'careerStage':researcherCds,
            'activity':researcherActivity,
            'grantKeywords':researcherGrantKW,
            'grants':researcherGrant,
            'publicationKeywords':researcherPubKW,
            'publications':researcherPub,
            'profile':researcherProfile,
            'clusters':researcherCluster,
            'keywords':researcherKW,
        }

        // if the researcher is in the database
        if (allResearchers[researcherEmail] != undefined) {
            prevResearcher = allResearchers[researcherEmail]
            // get the previous version
            // JSON.stringify is better than .toString() because it doesnt crash from a null value and can also store lists
            previousVersion = [JSON.stringify(prevResearcher.name), JSON.stringify(prevResearcher.email), JSON.stringify(prevResearcher.school), JSON.stringify(prevResearcher.gender), JSON.stringify(prevResearcher.careerStage), JSON.stringify(prevResearcher.activity), JSON.stringify(prevResearcher.clusters), JSON.stringify(prevResearcher.keywords.join("\n"), prevResearcher.publications.join("\n"), prevResearcher.publicationKeywords.join("\n"), prevResearcher.grants), JSON.stringify(prevResearcher.grantKeywords), JSON.stringify(prevResearcher.profile), "This researcher's data has been recalculated."]
            // add the date to the previous version
            previousVersion.push(date)
            // add the users name to the previous version
            previousVersion.push(req.session.useremail)
            previousVersion.push(req.session.username)
            // get the versioninformation list of the researcher
            versionInformation = prevResearcher.versionInformation
            // ensure that versionInformation is a list
            if (versionInformation == undefined || versionInformation == null) {
                versionInformation = []
            }
            // add it to the version information list
            versionInformation.push(previousVersion)

            // update each piece of information to the database
            Object.entries(newResearcher).forEach(async ([column,newValue]) => {
                if (newValue == undefined || prevResearcher[column] == newValue) {
                    // that value hasnt been updated
                    // so dont have to do anything
                } else {
                    // ensure that its cluster ID, not cluster name
                    if (column == 'clusters') {
                        temp = [] // this will store the cluster IDs (newValue currently stores cluster names)
                        for (n in newValue) {
                            clusterName = newValue[n]
                            clusterID = clusterDictionary[clusterName] // get the cluster ID
                            temp.push(clusterID) // add to temp
                        }
                        newValue = temp
                    }

                    // ensure that its a number, not a string, for CDS
                    if (column == 'careerStage') {
                        // convert the string value for CDS to an integer
                        if (newValue == 'PD') {
                            newValue = 1
                        } else if (newValue == 'ECR') {
                            newValue = 2
                        } else if (newValue == 'MCR') {
                            newValue = 3
                        // SR by default
                        } else {
                            newValue = 4
                        }
                    }

                    // ensure that gender is in the correct format
                    if (column == 'gender') {
                        if (newValue == 'female' || newValue == 'mostly_female') {
                            newValue = 'F'
                        } else if (newValue == 'male' || newValue == 'mostly_male') {
                            newValue = 'M'
                        } else {
                            newValue = 'U'
                        }
                    }

                    // turn the string keywords into a list
                    if (column == 'keywords') {
                        newValue = newValue.split('; ')
                    }

                    // update that value
                    await queryWithRetry('UPDATE researchers SET ' + column + ' = $1 WHERE email = $2;', [newValue, researcherEmail]);
                }
            })
        } else {
            // add the researcher
            await queryWithRetry('INSERT INTO researchers (email, name, school, gender, publications, "publicationKeywords", grants, "grantKeywords", keywords, clusters, profile, activity, "careerStage", "versionInformation") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)', [researcherEmail, researcherName, '', 'U', [], [], [], [], [], [], '', 1, 0, []]);

            // update each piece of information to the database
            Object.entries(newResearcher).forEach(async ([column,newValue]) => {
                if (newValue == undefined) {
                    // that value hasnt been provided
                } else {
                    // ensure that its cluster ID, not cluster name
                    if (column == 'clusters') {
                        temp = [] // this will store the cluster IDs (newValue currently stores cluster names)
                        for (n in newValue) {
                            clusterName = newValue[n]
                            clusterID = clusterDictionary[clusterName] // get the cluster ID
                            temp.push(clusterID) // add to temp
                        }
                        newValue = temp
                    }

                    // ensure that its a number, not a string, for CDS
                    if (column == 'careerStage') {
                        // convert the string value for CDS to an integer
                        if (newValue == 'PD') {
                            newValue = 1
                        } else if (newValue == 'ECR') {
                            newValue = 2
                        } else if (newValue == 'MCR') {
                            newValue = 3
                        // SR by default
                        } else {
                            newValue = 4
                        }
                    }

                    // ensure that gender is in the correct format
                    if (column == 'gender') {
                        if (newValue == 'female' || newValue == 'mostly_female') {
                            newValue = 'F'
                        } else if (newValue == 'male' || newValue == 'mostly_male') {
                            newValue = 'M'
                        } else {
                            newValue = 'U'
                        }
                    }

                    // turn the string keywords into a list
                    if (column == 'keywords') {
                        newValue = newValue.split('; ')
                    }

                    // update that value
                    await queryWithRetry('UPDATE researchers SET "' + column + '" = $1 WHERE email = $2;', [newValue, researcherEmail]);
                }
            })
        }

        // get the current xp
        const mq2 = 'SELECT xp FROM users WHERE email = $1'
        const result2 = await queryWithRetry(mq2, [req.session.useremail]);

        if (result2.rows.length == 0) {
            res.send({alert: 'Something went wrong when getting your XP and account details. If the issue persists, please let me know.'})
            return
        }

        // otherwise, add 5 to the xp
        currentXp = result2.rows[0].xp
        const mq3 = 'UPDATE users SET xp = $1 WHERE email = $2'
        const result3 = await queryWithRetry(mq3, [currentXp + 5, req.session.useremail]);

        // get all changes
        const mq4 = 'SELECT "changeID" FROM changelog'
        const result4 = await queryWithRetry(mq4);

        // calculate the maximum changeID
        maxChangeID = 0
        for (i in result4.rows) {
            rowID = result4.rows[i].changeID
            if (rowID > maxChangeID) {
                maxChangeID = rowID
            }
        }

        // calculate the next change ID
        nextChangeID = maxChangeID + 1

        // add 'grant edited' change to changelog
        const mq5 = 'INSERT INTO changelog ("changeID", "userEmail", "type", date, description, "excludedFromView") VALUES ($1, $2, $3, $4, $5, $6)'
        const result5 = await queryWithRetry(mq5, [nextChangeID, req.session.useremail, 'Researcher Recalculated', date, `${researcherName}'s data has been recalculated.`, '{}']);
        
        res.send({success: 'success'})
    } catch (err) {
        console.log(err)

        res.send({alert: 'Something went wrong. Please ensure all of the inputs are valid. This might be a server-side issue. If this problem persists, please open a ticket and I will get this fixed ASAP.'});
    }
} 

// update the database when a code is added
const addcodepost = async (req, res)=>{
    console.log("ADD CODE POST")

    // TODO: ensure the role is correct
    // only allow them to manage codes if they havent been authenticated yet
    if (!req.isAuthenticated()) {
        res.send({alert: 'Please login first :)'});
        return
    }

    x = req.body
    console.log(x)

    if (!x.email || !x.code || !x.role) {
        res.send({alert: 'Please ensure that all inputs are filled in.'})
        return
    }

    try {
        // get the current date
        now = new Date();

        // separate the parts of the date and ensure month and day are always two digits (e.g., 05 not 5)
        year = now.getFullYear()
        month = new Intl.DateTimeFormat('en', { month: '2-digit' }).format(now)
        day = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(now)

        // stringify it
        date = `${day}-${month}-${year}`

        // add the researcher
        await queryWithRetry('INSERT INTO codes ("userEmail", code, "role", "dateAdded") VALUES ($1, $2, $3, $4)', [x.email, x.code, x.role, date]);
        
        // get the current xp
        const mq2 = 'SELECT xp FROM users WHERE email = $1'
        const result2 = await queryWithRetry(mq2, [req.session.useremail]);

        if (result2.rows.length == 0) {
            res.send({alert: 'Something went wrong when getting your XP and account details. If the issue persists, please let me know.'})
            return
        }

        // otherwise, add 5 to the xp
        currentXp = result2.rows[0].xp
        const mq3 = 'UPDATE users SET xp = $1 WHERE email = $2'
        const result3 = await queryWithRetry(mq3, [currentXp + 5, req.session.useremail]);

        // get all changes
        const mq4 = 'SELECT "changeID" FROM changelog'
        const result4 = await queryWithRetry(mq4);

        // calculate the maximum changeID
        maxChangeID = 0
        for (i in result4.rows) {
            rowID = result4.rows[i].changeID
            if (rowID > maxChangeID) {
                maxChangeID = rowID
            }
        }

        // calculate the next change ID
        nextChangeID = maxChangeID + 1

        // add 'grant edited' change to changelog
        const mq5 = 'INSERT INTO changelog ("changeID", "userEmail", "type", date, description, "excludedFromView") VALUES ($1, $2, $3, $4, $5, $6)'
        const result5 = await queryWithRetry(mq5, [nextChangeID, req.session.useremail, 'Code Added', date, `A new code has been added for a new user with the email ${x.email}.`, '{}']);
        
        res.send({success: 'success'})
    } catch (err) {
        console.log(err)

        res.send({alert: 'Something went wrong. Please ensure all of the inputs are valid. This might be a server-side issue. If this problem persists, please open a ticket and I will get this fixed ASAP.'});
    }
} 

// update the database when a code is removed
const removecodepost = async (req, res)=>{
    console.log("REMOVE CODE POST")

    // TODO: ensure the role is correct
    // only allow them to manage codes if they havent been authenticated yet
    if (!req.isAuthenticated()) {
        res.send({alert: 'Please login first :)'});
        return
    }
} 

// Export of all methods as object 
module.exports = { 
    indexget,
    loginget,
    signupget,
    addgrantget,
    grantpageget,
    editgrantget,
    matchget,
    recalculateget,
    managecodesget,

    indexpost,
    loginpost,
    signuppost,
    addgrantpost,
    editgrantpost,
    deletegrantpost,
    confirmmatchpost,
    confirmrecalculationpost,
    addclusterspost,
    addcodepost,
    removecodepost,
}