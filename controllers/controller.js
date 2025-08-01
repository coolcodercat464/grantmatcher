const path = require('path');                                // install path
const options = {root: path.join(__dirname, '../public')};   // set options (root)

// allow the backend to access the database
const db = require(path.join(__dirname, '../databases/postgres.js'))

// password hashing stuff
var MD5 = require("crypto-js/md5");

// passport authentication stuff
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

// nlp stuff
const natural = require('natural'); // nlp for js (faster than python)
const f = require('session-file-store');
// link to python script
const spawn = require('child_process').spawn;

// Provide the path of the python executable, if python is available as 
// environment variable then you can use only "python"
var pythonExecutable = "../venvs/myenv/bin/python3"

// the email for the developer (for making tickets)
var developerEmail = 'flyingbutter213@gmail.com'

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

    // get all user credentials
    res = await queryWithRetry('SELECT * FROM users');

    // res is a list of dictionaries
    res = res.rows
    
    return res
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
    // insert the user's data into the database
    await queryWithRetry('INSERT INTO users (name, email, password, role, "grantsMatched", xp, "dateJoined", "colourTheme", "notificationPreferences") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)', [userName, email, password, role, 0, 0, date, "light", false]);
    
    // get all changes
    result = await queryWithRetry('SELECT "changeID" FROM changelog');

    // calculate the maximum changeID
    maxChangeID = 0
    for (x in result.rows) {
        rowID = result.rows[x].changeID
        if (rowID > maxChangeID) {
            maxChangeID = rowID
        }
    }

    // calculate the next change ID
    nextChangeID = maxChangeID + 1

    // add 'user joined' change to changelog
    await queryWithRetry('INSERT INTO changelog ("changeID", "userEmail", "type", date, description, "excludedFromView") VALUES ($1, $2, $3, $4, $5, $6)', [nextChangeID, email, 'User Joined', date, `${newUser.name} joined Grant Matcher! Please make them feel welcome!`, '{}']);
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

    // get all codes
    res = await queryWithRetry('SELECT "userEmail", code, role FROM codes');

    // res is a list of dictionaries
    res = res.rows
    
    return res
}

// find a user by their email
async function get_user_by_email(useremail) {
    // the user object (initially undefined)
    theuser = undefined

    // get a list of users
    users = await users_list();

    // linear search to find the user with the email
    for (i in users) {
        if (users[i].email == useremail) {
            theuser = users[i];
            break;
        }
    }

    return theuser
}

// add days to a date object in js
function addDays(date, days) {
  var result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// check if the user is suspended or not
async function verifyUser(req) {
    theuser = await get_user_by_email(req.session.useremail)

    if (theuser != undefined) {
        if (!['developer', 'manager', 'user'].includes(theuser.role)) {
            // they must be suspended
            suspensionDetails = theuser.role.split(':')

            // `get suspension details
            duration = parseInt(suspensionDetails[1])
            date = suspensionDetails[2]
            role = suspensionDetails[3]

            if (duration == NaN) { duration = 0 }

            // get date unsuspended
            date = new Date(date.split('-')[2], parseInt(date.split('-')[1]) - 1, date.split('-')[0])

            // separate the parts of the date and ensure month and day are always two digits (e.g., 05 not 5)
            year = date.getFullYear()
            month = new Intl.DateTimeFormat('en', { month: '2-digit' }).format(date)
            day = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(date)

            // stringify it
            dateString = `${day}-${month}-${year}`

            // get date of unsuspension
            unsuspended = addDays(date, duration)

            // get today's date
            now = new Date()

            // separate the parts of the date and ensure month and day are always two digits (e.g., 05 not 5)
            year = now.getFullYear()
            month = new Intl.DateTimeFormat('en', { month: '2-digit' }).format(now)
            day = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(now)

            nowString = `${day}-${month}-${year}`

            // if it is past the unsuspension date
            if (now >= unsuspended) {
                await queryWithRetry('UPDATE users SET role = $1 WHERE email = $2', [role, req.session.useremail])
                await queryWithRetry('INSERT INTO changelog ("changeID", "userEmail", "type", date, description, "excludedFromView") VALUES ($1, $2, $3, $4, $5, $6)', [nextChangeID, theuser.email, 'User Unsuspended', nowString, `${theuser.name} has been automatically unsuspended. They are returning as ${role}.`, []]);
                return 'success'
            }

            // separate the parts of the date and ensure month and day are always two digits (e.g., 05 not 5)
            year = unsuspended.getFullYear()
            month = new Intl.DateTimeFormat('en', { month: '2-digit' }).format(unsuspended)
            day = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(unsuspended)

            // stringify it
            unsuspendedString = `${day}-${month}-${year}`

            // get reason for suspension
            reason = suspensionDetails[4]

            // in case there are colons in the reason
            for (var i = 5; i < suspensionDetails.length; i++) {
                reason += suspensionDetails[i]
            }

            return {duration: duration, date: dateString, unsuspended: unsuspendedString, reason: reason}
        } else {
            return 'success'
        }
    } else {
        return 'login'
    }
}

// check if something is a string or not
function isString(variable) {
  return typeof variable === 'string';
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
            <p>"If we knew what we were doing, it would not be called research, would it?" - Albert Einstein</p>
        </div>
        <div class="together" style="justify-content: center;">
            <div><a href="/login">Login</a></div> 
            <div><a href="/signup">Signup</a></div> 
            <div><a href="/tutorial">Tutorial</a></div> 
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

// DATABASE ROUTES
// for code reuse
async function queryAll(table, req) {
    // ensure the user is logged in before giving them the data
    if (req.isAuthenticated() && await verifyUser(req) == 'success') {
        // ensure that you don't get the users' passwords
        if (table == 'users') {
            result = await queryWithRetry(`SELECT name, email, role, "grantsMatched", xp, "dateJoined", "colourTheme", "notificationPreferences" FROM ${table}`);
        } else {
            result = await queryWithRetry(`SELECT * FROM ${table}`);
        }

        result = result.rows
        return result
    } else {
        return []
    }
}

const dbresearchers =  async (req, res) => {
    res.send(await queryAll('researchers', req))
}

const dbgrants = async (req, res) => {
    res.send(await queryAll('grants', req))
}

const dbgrantversion = async (req, res) => {
    result = [] // what to put in res.send()
    if (req.isAuthenticated() && await verifyUser(req) == 'success') {
        result = await queryWithRetry(`SELECT "versionInformation" FROM grants WHERE "grantID" = $1`, [id]);
        result = result.rows
    }

     res.send(result)
}

const dbresearcherversion = async (req, res) => {
    result = [] // what to put in res.send()
    if (req.isAuthenticated() && await verifyUser(req) == 'success') {
        result = await queryWithRetry(`SELECT "versionInformation" FROM researchers WHERE "email" = $1`, [id]);
        result = result.rows
    }

     res.send(result)
}

const dbclusters = async (req, res) => {
    res.send(await queryAll('clusters', req))
}

const dbusers = async (req, res) => {
    res.send(await queryAll('users', req))
}

const dbchangelog = async (req, res) => {
    // ensure the user is logged in before giving them the data
    if (req.isAuthenticated() && await verifyUser(req) == 'success') {
        // get info about the user
        user = await get_user_by_email(req.session.useremail)

        // get everything in changelog
        result = await queryWithRetry(`SELECT * FROM changelog`);

        filteredResults = [] // will store all changes that the user is permitted to view

        // iterate through result
        for (r in result.rows) {
            change = result.rows[r]

            // get the date
            changeDate = new Date(change.date.split('-')[2], change.date.split('-')[1], change.date.split('-')[0])
            userDate = new Date(user.dateJoined.split('-')[2], user.dateJoined.split('-')[1], user.dateJoined.split('-')[0])

            // only allow user to view the change if the change happened after they joined AND they aren't in excludedFromView
            if (userDate <= changeDate && !change.excludedFromView.includes(user.email)) {
                filteredResults.push(change)
            }
        }
        
        res.send(filteredResults)
    } else {
        res.send([])
    }
}

const dbcodes = async (req, res) => {
    res.send(await queryAll('codes', req))
}

// NLP ROUTES
// js nlp routes (faster but might be less accurate)

// when the user wants to match a word to the clusters
const nlpclustermatch = async (req, res) => {
    const receivedData = req.body;

    // ensure that they are logged in first
    if (!req.isAuthenticated()) {
        res.send({"error": "Please log in first :)", "relevant": []})
        return
    }

    // handle suspended users
    suspensionDetails = await verifyUser(req)
    if (!isString(suspensionDetails)) {
        res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
        return
    }

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
}

// python nlp routes

// Match logic layer
const nlpmatch = async (req, res) => {
    console.log(req.session.useremail)

    // ensure that they are logged in first
    if (!req.isAuthenticated()) {
        res.send({status: "error", alert: 'Please login first :)'});
        return
    }

    // handle suspension
    suspensionDetails = await verifyUser(req)
    if (!isString(suspensionDetails)) {
        res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
        return
    }

    // STEP 1 - preliminary filtering (get researcherPool)
    x = req.body
    
    // error out if the inputs are invalid
    if (x == undefined || !x.matchKeywords || x.matchKeywords.length == 0) {
    res.send({status: "error", alert: 'Your input is invalid. Please ensure that you have filled out the keywords entry.'})
    return
    }

    // ensure that the method is valid
    if (!x.matchMethod || ["cluster", "direct"].includes(x.matchMethod) == false) {
    res.send({status: "error", alert: 'Something went wrong when processing whether you would like to match through clusters or directly. If this issue persists, please let me know.'})
    return
    }

    // ensure that the cutoff method is valid
    if (!x.cutOffMethod || !x.cutOff || ["number", "strictness"].includes(x.cutOffMethod) == false) {
    res.send({status: "error", alert: 'Something went wrong when processing your cut-off parameters. If this issue persists, please let me know.'})
    return
    }

    // if lower or higher activity range isnt provided, use the maximum/minimum values
    noActivityProvided = false;
    if (x.lower == '' && x.higher == '') { noActivityProvided = true; }
    if (x.lower == '') { x.lower = 0 }
    if (x.higher == '') { x.higher = 1 }

    // get the match keywords
    keywords = x.matchKeywords

    // get all the clusters
    allClustersDict = await queryAll('clusters', req)
    allClusters = []

    // get all cluster names
    for (i in allClustersDict) {
    cluster = allClustersDict[i]
    clusterName = cluster.name
    allClusters.push(clusterName)
    }

    // get all the researchers
    allResearchers = await queryAll('researchers', req)

    // list of all researchers
    researcherPool = []

    for (i in allResearchers) {
    researcher = allResearchers[i]

    // ensure that these fields match the researcher's data
    schoolCorrect = (x.school == "all" || researcher.school == x.school)
    genderCorrect = (x.gender == "all" || researcher.gender == x.gender)
    careerCorrect = (x.career == "all" || researcher.careerStage == x.career) 
    activityCorrect = ((researcher.activity >= x.lower && researcher.activity <= x.higher))

    // activityCorrect is true if no activity is provided (useful if the researcher's activity is null)
    if (noActivityProvided) { activityCorrect = true }

    // if the cluster list is empty, then set this to true
    clusterCorrect = (x.clusters[0].length == 0)

    // the names of the researcher's clusters
    clustersNames = []

    // loop through each of the researcher's clusters
    for (j in researcher.clusters) {
        cl = researcher.clusters[j] // this isn't a string, but an id

        // get the name of that cluster and add it to clustersNames
        for (k in allClustersDict) {
            if (allClustersDict[k].clusterID == cl) {
            clustersNames.push(allClustersDict[k].name)
            }
        }

        // check if the cluster is in the selected clusters list
        if (x.clusters[1].includes(cl)) {
            // once such a pair found, it matches and no further searching is necessary
            clusterCorrect = true
            break
        }
    }

    // only add the researchers to the list if they match all criteria
    if (schoolCorrect && genderCorrect && careerCorrect && activityCorrect && clusterCorrect) {
        researcherPool.push({clustersNames: clustersNames, email: researcher.email, keywords: researcher.keywords})
    }
    }

    // error out if no researchers found in preliminary filtering
    if (researcherPool.length == 0) {
    res.send({status: "error", alert: "No researchers were found given your filtration specifications. Try again with different parameters!"})
    return
    }

    // STEP 2 - use the python NLP program
    // store the output (its very long so the JSON will get processed over multiple .stdout.on() events)
    output = '';

    error = false;

    // execute the python script
    const scriptExecution = spawn(pythonExecutable, 
        ["match.py", JSON.stringify(keywords), JSON.stringify(allClusters), x.cutOffMethod, x.cutOff, x.matchMethod]);

    scriptExecution.stdin.write(JSON.stringify(researcherPool));
    scriptExecution.stdin.end();

    // Handle normal output
    scriptExecution.stdout.on('data', async (data) => {
        output += data.toString(); // Accumulate output
        console.log(output)
    });

    // Handle error output
    scriptExecution.stderr.on('data', (data) => {
        // ensure that no errors occured
        if (!error) {
        error = true;

        console.error(data.toString())
        res.send({status: 'error', alert: "Something wrong happened while matching researchers. Please try again. If this problem persists, please open a ticket to let me know."})
        return
        }
    });

    // when the python script finished executing
    scriptExecution.on('close', (code) => {
        // ensure that no errors occured
        if (!error) {
        // only parse the JSON when it finished
        result = JSON.parse(output);
        res.send({'result': result})
        return
        } 
    });
}

// Recalculate logic layer
const nlprecalculate = async (req, res) => {
    console.log(req.session.useremail)

    // ensure that they are logged in first
    if (!req.isAuthenticated()) {
        res.send({status: "error", alert: 'Please login first :)'});
        return
    }

    // handle suspended users
    suspensionDetails = await verifyUser(req)
    if (!isString(suspensionDetails)) {
        res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
        return
    }

    x = req.body

    // store the output (its very long so the JSON will get processed over multiple .stdout.on() events)
    output = '';

    error = false; // whether an error occured or not (prevents multiple headers error)

    // get the clusters
    clusterNames = []
    // if they don't want to add new clusters
    if (x.addClusters == 'no') {
    clusters = await queryWithRetry('SELECT name FROM clusters')
    clusters = clusters.rows
    for (i in clusters) {
        clusterNames.push(clusters[i].name) // add the name to the list
    }
    }

    // execute the python script
    const scriptExecution = spawn(pythonExecutable, 
    ["recalculate.py", JSON.stringify(x.fields), JSON.stringify(x.researchers), x.number, x.strictness, x.range, x.googleScholar, JSON.stringify(clusterNames)]);

    // Handle normal output
    scriptExecution.stdout.on('data', async (data) => {
        output += data.toString(); // Accumulate output
    });

    // Handle error output
    scriptExecution.stderr.on('data', (data) => {
    console.error(data.toString())
    
    // ensure that no errors occured already (otherwise a message would have already been sent)
    if (!error) {
        error = true; // set error to true

        res.send({status: "error", alert: "Something wrong happened while recalculating researchers. Please try again. If this problem persists, please open a ticket to let me know."})
    }
    });

    // when the python script finished executing
    scriptExecution.on('close', (code) => {
    // ensure that no errors occured
    if (!error) {
        // only parse the JSON when it finished
        result = JSON.parse(output);
        res.send({'result': result})
        return
    } 
    });
}

// GET
// the home-page
const indexget = async (req, res)=>{
    console.log("INDEX GET")
    console.log(req.isAuthenticated());

    // dashboard if the user is signed-in, and landing page if they arent
    if (req.isAuthenticated()) {
        // handle suspended users
        suspensionDetails = await verifyUser(req)
        if (!isString(suspensionDetails)) {
            res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
            return
        }

        // find the user
        theuser = await get_user_by_email(req.session.useremail)

        if (theuser != undefined) {
            tempShow = showAlertDashboard // temporarily store the showAlertDashboard (as we need to set it to no)
            showAlertDashboard = "no"
            res.render('dashboard.ejs', {root: path.join(__dirname, '../public'), head: headpartial, user: theuser.name, role: theuser.role, footer: partialfooterLoggedIn, showAlert: tempShow});
        } else {
            req.session.destroy()
            res.redirect('/')
        }
    } else {
        res.render('landing.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedOut});
    }
}

// present the tutorial page
const tutorialget = async (req, res) => {
    console.log('TUTORIAL GET')

    if (req.isAuthenticated()) {
        res.render('tutorial.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn});
    } else {
        res.render('tutorial.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedOut});
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

  // validation - ensure id is an integer (id might be 'script.js' sometimes)
  if (!isStringInteger(id) || parseInt(id) <= 0) {
    res.status(404).render('grantPage.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn, title: "Unknown Title", user: "unknown user", date: "unknown", url: "unknown URL", deadline: "unknown deadline", duration: "unknown duration", clusters: "", id: id, keywords: "", description: "", researchers: "", showAlert: 'Something went wrong when fetching the data from our servers. Please refresh the page and ensure that the URL path is typed in correctly. If the issue persists, please open a ticket to let me know.'});
    return
  }
  
  // only allow them to access this page if they have been authenticated
  if (req.isAuthenticated()) {
    // handle suspended users
    suspensionDetails = await verifyUser(req)
    if (!isString(suspensionDetails)) {
        res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
        return
    }

    console.log(suspensionDetails)

    // get the grant data
    result = await queryWithRetry('SELECT * FROM grants WHERE "grantID" = $1', [id]);
    grant = result.rows

    // ensure that grant exists
    if (grant.length == 0) {
        res.status(404).render('grantPage.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn, title: "", user: "", date: "", url: "", deadline: "", duration: "", clusters: "", id: id, keywords: "", description: "", researchers: "", showAlert: 'This grant does not exist yet. Maybe you can help make it by adding a grant!'});
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

    // render the page
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
        // handle suspended users
        suspensionDetails = await verifyUser(req)
        if (!isString(suspensionDetails)) {
            res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
            return
        }

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
    if (!isStringInteger(id) || parseInt(id) <= 0) {
        res.status(404).render('grantPage.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn, title: "Unknown Title", user: "unknown user", date: "unknown", url: "unknown URL", deadline: "unknown deadline", duration: "unknown duration", clusters: "", id: id, keywords: "", description: "", researchers: "", matched: "unknown", showAlert: 'Something went wrong when fetching the data from our servers. Please refresh the page and ensure that the URL path is typed in correctly. If the issue persists, please open a ticket to let me know.'});
        return
    }

    // only allow them to signup if they have been authenticated
    if (req.isAuthenticated()) {
        // handle suspended users
        suspensionDetails = await verifyUser(req)
        if (!isString(suspensionDetails)) {
            res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
            return
        }

        id = parseInt(id)

        // get the grants data
        result = await queryWithRetry('SELECT * FROM grants WHERE "grantID" = $1', [id]);
        grant = result.rows

        // 404 if the grant doesnt exist yet
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
        clusters = grant.clusters
        keywords = grant.keywords
        researchers = grant.researchers

        // reformat deadline
        deadline = grant.deadline
        dateSplit = deadline.split('-')
        deadline = dateSplit[2] + '-' + dateSplit[1] + '-' + dateSplit[0]

        // render the edit grant page
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
        // handle suspended users
        suspensionDetails = await verifyUser(req)
        if (!isString(suspensionDetails)) {
            res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
            return
        }

        // get the grant data
        const result = await queryWithRetry('SELECT * FROM grants WHERE "grantID" = $1', [id]);
        grant = result.rows

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

        // render the page
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
        // handle suspended users
        suspensionDetails = await verifyUser(req)
        if (!isString(suspensionDetails)) {
            res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
            return
        }

        res.render('recalculate.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn});
    } else {
        urlinit = '/recalculate'
        res.redirect('/login')
    }
}

// present the manage codes page
const managecodesget = async (req, res)=>{
    console.log("MANAGE CODES GET")

    // only allow them to manage codes if they havent been authenticated yet
    if (req.isAuthenticated()) {
        // handle suspended users
        suspensionDetails = await verifyUser(req)
        if (!isString(suspensionDetails)) {
            res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
            return
        }

        // ensure that they are a manager/developer
        const result1 = await queryWithRetry('SELECT role FROM users WHERE email = $1', [req.session.useremail]);
        userRole = result1.rows[0].role

        // send error message if they have the incorrect roles
        if (!['manager', 'developer'].includes(userRole)) {
            res.send({alert: 'It looks like you aren\'t a manager/developer, so you aren\'t authorised to remove codes.'})
            return
        }
        res.render('manageCodes.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn});
    } else {
        urlinit = '/managecodes' // redirect them to the current url after they logged in
        res.render('login.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedOut, urlinit: urlinit});
    }
} 

// present the researcher page
const researcherpageget = async (req, res)=>{
  console.log("RESEARCHER PAGE GET")

  // get the id (from the route name itself)
  id = req.params.id
  console.log(id);
  
  // only allow them to access this page if they have been authenticated
  if (req.isAuthenticated()) {
    // handle suspended users
    suspensionDetails = await verifyUser(req)
    if (!isString(suspensionDetails)) {
        res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
        return
    }

    // get the researcher data
    const result = await queryWithRetry('SELECT * FROM researchers WHERE "email" = $1', [id]);
    researcher = result.rows

    if (researcher.length == 0) {
        res.status(404).render('researcherPage.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn, id: id, showAlert: 'Something went wrong when fetching the data from our servers. Please refresh the page and ensure that the URL path is typed in correctly. If the issue persists, please open a ticket to let me know.', email: "", name: "", gender: "", school: "", clusters: "", activity: "", careerStage: "", profile: '', keywords: [], grants: [], grantKeywords: [], publications: [], publicationKeywords: [], dateAdded: ''});
        return
    } else {
        researcher = researcher[0]
    }
    
    // get the relevant fields
    researcherName = researcher.name
    email = researcher.email
    school = researcher.school
    gender = researcher.gender
    careerStage = researcher.careerStage
    activity = researcher.activity
    dateAdded = researcher.dateAdded

    // prevents errors (check if the field is null before joining)
    if (researcher.publications == null || researcher.publications == undefined || researcher.publications.length == 0) {
        publications = "Unknown"
    } else {
        publications = researcher.publications.join("\n")
    }

    if (researcher.publicationKeywords == null || researcher.publicationKeywords == undefined || researcher.publicationKeywords.length == 0) {
        publicationKeywords = "Unknown"
    } else {
        publicationKeywords = researcher.publicationKeywords.join("\n")
    }

    if (researcher.grants == null || researcher.grants == undefined || researcher.grants.length == 0) {
        grants = "Unknown"
    } else {
        grants = researcher.grants.join("\n")
    }

    if (researcher.grantKeywords == null || researcher.grantKeywords == undefined || researcher.grantKeywords.length == 0) {
        grantKeywords = "Unknown"
    } else {
        grantKeywords = researcher.grantKeywords.join("\n")
    }

    if (researcher.keywords == null || researcher.keywords == undefined || researcher.keywords.length == 0) {
        keywords = "Unknown"
    } else {
        keywords = researcher.keywords.join("\n")
    }
    
    if (researcher.clusters == null || researcher.clusters == undefined || researcher.clusters.length == 0) {
        clusters = ""
    } else {
        clusters = researcher.clusters.join(", ")
    }

    profile = researcher.profile
    versionInformation = researcher.versionInformation

    // turn the careerstage integer from an integer to a string
    if (careerStage == 1) {
        careerStage = "Post-Doc"
    } else if (careerStage == 2) {
        careerStage = "Early-Career Researcher"
    } else if (careerStage == 3) {
        careerStage = "Mid-Career Researcher"
    } else if (careerStage == 4) {
        careerStage = "Senior Researcher"
    } else {
        careerStage = "Unknown"
    }

    // handle when the fields are null
    if (activity == null || activity == undefined || activity == '') {
        activity = "Unknown"
    }

    if (school == null || school == undefined || school == '') {
        school = "Unknown"
    } else {
        // parse the school value
        if (school == 'chemistry') { school = 'School of Chemistry' }
        else if (school == 'geoscience') { school = 'School of Geosciences' }
        else if (school == 'biology') { school = 'School of Life and Environmental Sciences' }
        else if (school == 'veterinary') { school = 'School of Veterinary Science' }
        else if (school == 'mathematics') { school = 'School of Mathematics and Statistics' }
        else if (school == 'physics') { school = 'School of Physics' }
        else if (school == 'philosphy') { school = 'School of History and Philosophy of Science' }
        else if (school == 'psychology') { school = 'School of Psychology' }
        else { school = "Unknown" }
    }

    if (gender == null || gender == undefined || gender == '') {
        gender = "Unknown"
    } else {
        // parse the gender value
        if (gender == 'F') { gender = 'Female' }
        else if (gender == 'M') { gender = 'Male' }
        else if (gender == 'N') { gender = 'Non-Binary' }
        else if (gender == 'U') { gender = 'Unknown' }
        else { gender = "Unknown" }
    }

    res.render('researcherPage.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn, id: id, showAlert: 'no', email: email, name: researcherName, gender: gender, school: school, cluster: clusters, activity: activity, careerStage: careerStage, profile: profile, keywords: keywords, grants: grants, grantKeywords: grantKeywords, publications: publications, publicationKeywords: publicationKeywords, dateAdded: dateAdded});
  } else {
    urlinit = '/researcher/' + id // redirect them to the current url after they logged in
    res.render('login.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedOut, showAlert: 'no', urlinit: urlinit});
  }
};

// present the edit researcher page
const editresearcherget = async (req, res)=>{
    console.log("EDIT RESEARCHER GET")
    id = req.params.id
    console.log(id)

    // only allow them to signup if they havent been authenticated yet
    if (req.isAuthenticated()) {
        // handle suspended users
        suspensionDetails = await verifyUser(req)
        if (!isString(suspensionDetails)) {
            res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
            return
        }

        // get the researcher data
        const result = await queryWithRetry('SELECT * FROM researchers WHERE "email" = $1', [id]);
        researcher = result.rows

        if (researcher.length == 0) {
            res.status(404).render('researcherPage.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn, id: id, showAlert: 'Something went wrong when fetching the data from our servers. Please refresh the page and ensure that the URL path is typed in correctly. If the issue persists, please open a ticket to let me know.', email: "unknown", name: "unknown", gender: "unknown", school: "unknown", cluster: "unknown", activity: "unknown", careerStage: "unknown", profile: '', keywords: [], grants: [], grantKeywords: [], publications: [], publicationKeywords: []});
            return
        } else {
            researcher = researcher[0]
        }
        
        // get the relevant fields
        researcherName = researcher.name
        email = researcher.email
        school = researcher.school
        gender = researcher.gender
        careerStage = researcher.careerStage
        activity = researcher.activity
        
        // prevents errors (check if the field is null before joining)
        if (researcher.publications == null || researcher.publications == undefined || researcher.publications.length == 0) {
            publications = []
        } else {
            publications = researcher.publications
        }

        if (researcher.publicationKeywords == null || researcher.publicationKeywords == undefined || researcher.publicationKeywords.length == 0) {
            publicationKeywords = []
        } else {
            publicationKeywords = researcher.publicationKeywords
        }

        if (researcher.grants == null || researcher.grants == undefined || researcher.grants.length == 0) {
            grants = []
        } else {
            grants = researcher.grants
        }

        if (researcher.grantKeywords == null || researcher.grantKeywords == undefined || researcher.grantKeywords.length == 0) {
            grantKeywords = []
        } else {
            grantKeywords = researcher.grantKeywords
        }

        if (researcher.keywords == null || researcher.keywords == undefined || researcher.keywords.length == 0) {
            keywords = []
        } else {
            keywords = researcher.keywords
        }
        
        if (researcher.clusters == null || researcher.clusters == undefined || researcher.clusters.length == 0) {
            clusters = []
        } else {
            clusters = researcher.clusters
        }

        profile = researcher.profile
        versionInformation = researcher.versionInformation

        res.render('editResearcher.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn, id: id, showAlert: 'no', email: email, name: researcherName, gender: gender, school: school, cluster: clusters, activity: activity, careerStage: careerStage, profile: profile, keywords: keywords, grants: grants, grantKeywords: grantKeywords, publications: publications, publicationKeywords: publicationKeywords});
    } else {
        urlinit = '/editresearcher/' + id // redirect them to the current url after they logged in
        res.render('login.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedOut, showAlert: 'no', urlinit: urlinit});
    }
}

// present the add researcher page
const addresearcherget = async (req, res)=>{
    console.log("ADD RESEARCHER GET")

    // only allow them to add researchers if they havent been authenticated yet
    if (req.isAuthenticated()) {
        // handle suspended users
        suspensionDetails = await verifyUser(req)
        if (!isString(suspensionDetails)) {
            res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
            return
        }

        res.render('addResearcher.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn});
    } else {
        urlinit = '/addresearcher' // redirect them to the current url after they logged in
        res.render('login.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedOut, urlinit: urlinit});
    }
} 

// present the add researcher page
const manageclustersget = async (req, res)=>{
    console.log("MANAGE CLUSTERS GET")

    // only allow them to add researchers if they havent been authenticated yet
    if (req.isAuthenticated()) {
        // handle suspended users
        suspensionDetails = await verifyUser(req)
        if (!isString(suspensionDetails)) {
            res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
            return
        }

        result = await queryWithRetry('SELECT * FROM clusters')
        console.log(result.rows)

        res.render('manageCluster.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn, showAlert: "no", clusters: result.rows});
    } else {
        urlinit = '/manageclusters' // redirect them to the current url after they logged in
        res.render('login.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedOut, urlinit: urlinit});
    }
} 

// present the tickets
const ticketsget = async (req, res)=>{
    console.log("TICKETS GET")

    // only allow them to see tickets if they have been authenticated
    if (req.isAuthenticated()) {
        // handle suspended users
        suspensionDetails = await verifyUser(req)
        if (!isString(suspensionDetails)) {
            res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
            return
        }

        tickets = await queryWithRetry('SELECT * FROM tickets')
        tickets = tickets.rows
        ticketsToDisplay = []

        for (t in tickets) {
            // calculate the user name from the poster's email
            user = await get_user_by_email(tickets[t].userEmail)
            if (user == undefined) {
                // then the user must have been deleted
                tickets[t].username = 'deleted user'
            } else {
                tickets[t].username = user.name
            }

            if (tickets[t].members.includes(req.session.useremail)) {
                ticketsToDisplay.push(tickets[t])
            }
        }
        
        res.render('tickets.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn, showAlert: 'no', tickets: ticketsToDisplay});
    } else {
        urlinit = '/tickets' // redirect them to the current url after they logged in
        res.render('login.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedOut, urlinit: urlinit});
    }
} 

// present the ticket page
const ticketpageget = async (req, res)=>{
    console.log("TICKET PAGE GET")

    // get the id (from the route name itself)
    id = req.params.id
    console.log(id);

    // validation - ensure id is an integer (id might be 'script.js' sometimes)
    if (!isStringInteger(id) || parseInt(id) <= 0) {
        res.status(404).render('ticketPage.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn, showAlert: 'Something went wrong when fetching the data from our servers. Please refresh the page and ensure that the URL path is typed in correctly. If the issue persists, please open a ticket to let me know.', ticketList: [], user: req.session.useremail, replies: []});
        return
    }

    // only allow them to see tickets if they have been authenticated
    if (req.isAuthenticated()) {
        // handle suspended users
        suspensionDetails = await verifyUser(req)
        if (!isString(suspensionDetails)) {
            res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
            return
        }

        ticket = await queryWithRetry('SELECT * FROM tickets WHERE "ticketID" = $1', [id])
        ticket = ticket.rows

        if (ticket.length == 0) {
            res.status(404).render('ticketPage.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn, showAlert: 'Something went wrong when fetching the data from our servers. Please refresh the page and ensure that the URL path is typed in correctly. If the issue persists, please open a ticket to let me know.', ticketList: [], user: req.session.useremail, replies: []});
            return
        } else {
            // get the poster's name from their email
            poster = await get_user_by_email(ticket[0].userEmail)

            if (poster == undefined) {
                ticket[0].username = 'a deleted user'
            } else {
                ticket[0].username = poster.name
            }

            // get the members names from their emails
            ticket[0].membersNames = []
            for (i in ticket[0].members) {
                // exclude the poster
                if (ticket[0].members[i] != ticket[0].userEmail) {
                    member = await get_user_by_email(ticket[0].members[i])
                    ticket[0].membersNames.push(member.name)
                }
            }

            // get the name of the most helpful user (if ticket has been resolved)
            if (ticket[0].resolutionDetails.length > 0) {
                helpfulUser = ticket[0].resolutionDetails[2]
                helpfulUser = await get_user_by_email(helpfulUser)
                if (poster == undefined) {
                    ticket[0].resolutionDetails.push('a deleted user')
                } else {
                    ticket[0].resolutionDetails.push(helpfulUser.name) // add name to the list
                }
            }
        }

        if (ticket[0].members.includes(req.session.useremail)) {
            console.log(ticket[0])

            // list of replies
            replies = await queryWithRetry('SELECT * FROM replies WHERE "ticketID" = $1 ORDER BY "replyID"', [ticket[0].ticketID])
            replies = replies.rows

            for (r in replies) {
                // get the poster for each reply
                poster = await get_user_by_email(replies[r].userEmail)
                // add it to the json dictionary
                if (poster == undefined) {
                    replies[r].username = 'a deleted user'
                } else {
                    replies[r].username = poster.name
                }
            }

            res.render('ticketPage.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn, showAlert: 'no', ticketList: ticket, user: req.session.useremail, replies: replies});
        } else {
            res.status(403).render('ticketPage.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn, showAlert: 'You are not a member of the ticket so you cannot view it.', ticketList: [], user: req.session.useremail, replies: []});
        }
    } else {
        urlinit = '/tickets' // redirect them to the current url after they logged in
        res.render('login.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedOut, urlinit: urlinit});
    }
} 

// present profile page
const profileget = async (req, res)=>{
    console.log("PROFILE GET")

    // only allow them to access profile page if the user is signed-in, and redirect to login if they aren't
    if (req.isAuthenticated()) {
        // handle suspended users
        suspensionDetails = await verifyUser(req)
        if (!isString(suspensionDetails)) {
            res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
            return
        }

        // find the user
        theuser = await get_user_by_email(req.session.useremail)

        // check if the user exists
        if (theuser != undefined) {
            res.render('profile.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn, showAlert: 'no', theuser: theuser});
        } else {
            req.session.destroy()
            res.redirect('/')
        }
    } else {
        urlinit = '/profile'
        res.redirect('/login')
    }
} 

// present user page
const userpageget = async (req, res)=>{
    console.log("USER PAGE GET")

    // get the id (from the route name itself)
    email = req.params.id
    console.log(email);

    // only allow them to access profile page if the user is signed-in, and redirect to login if they aren't
    if (req.isAuthenticated()) {
        // handle suspended users
        suspensionDetails = await verifyUser(req)
        if (!isString(suspensionDetails)) {
            res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
            return
        }

        // find the user
        user = await get_user_by_email(email)
        currentuser = await get_user_by_email(req.session.useremail)

        // get the role (only manager/dev have edit perms)
        if (currentuser == undefined) {
            role = 'user'
        } else {
            role = currentuser.role
        }

        console.log(email, user)

        // check if the user exists
        if (theuser != undefined) {
            res.render('userPage.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn, showAlert: 'no', theuser: user, role: role, currentuser: currentuser});
        } else {
            res.render('userPage.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedIn, theuser: [], role: role, showAlert: 'We couldn\'t find the user you were looking for. Please try again. Feel free to contact me if this issue persists.'});
        }
    } else {
        urlinit = '/user/' + email
        res.redirect('/login')
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

    // get the user inputs
    x = req.body;

    // ensure that all the fields are there
    if (!x.name || !x.password || !x.email || !x.authcode || !x.rememberme) {
        // give them an error pop-up
        res.send({alert: 'Please ensure all fields are filled.'});
        return
    }

    // get the form info
    username = x.name.replace(/<[^>]*>/g, '')
    password = x.password
    email = x.email.replace(/<[^>]*>/g, '')
    authcode = x.authcode
    rememberme = x.rememberme

    // add validation to name - name cannot just be spaces
    if (username.trim() === '') {
        // give them an error pop-up
        res.send({alert: 'Please ensure your name isn\'t empty!'});
        return
    } 

    // add validation to password - password must be at least 5 characters
    if (password.length < 5) {
        // give them an error pop-up
        res.send({alert: 'Your password must be at least 5 characters long. Please try again!'});
        return
    } 

    // get all the users
    users = await users_list();

    // check if the user is already in the database
    for (u in users) {
        user = users[u];
        if(email === user.email) {
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
        if (code.code == authcode && code.userEmail == email) {
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
    var newUser = {email: email, name: username, password: password};

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

    // handle suspended users
    suspensionDetails = await verifyUser(req)
    if (!isString(suspensionDetails)) {
        res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
        return
    }

    // isolate each field
    grantName = x.name.replace(/<[^>]*>/g, '')
    url = x.url.replace(/<[^>]*>/g, '')
    description = x.description.replace(/<[^>]*>/g, '')
    keywords = x.keywords.map(item => item.replace(/<[^>]*>/g, ''));
    deadline = x.deadline.replace(/<[^>]*>/g, '')

    // alert the user if the date is invalid
    if (new Date(deadline) == 'Invalid Date') {
        res.send({alert: 'The date is invalid. Please try again.'});
        return
    }

    // parse the dates
    dateSplit = deadline.split('-')
    reformattedDeadline = dateSplit[2] + '-' + dateSplit[1] + '-' + dateSplit[0]

    // parse the duration
    duration = parseFloat(x.duration)

    // ensure duration is positive
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

    // get all grant IDs
    const result = await queryWithRetry('SELECT "grantID" FROM grants');

    // calculate the maximum grantID
    maxGrantID = 0
    for (x in result.rows) {
        rowID = result.rows[x].grantID
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
} 

// edit a grant
const editgrantpost = async (req, res)=>{
    console.log("EDIT GRANT POST")

    // ensure that user is authenticated
    if (req.isAuthenticated() == false) {
        res.send({alert: 'Please login first :)'});
        return
    }

    // handle suspended users
    suspensionDetails = await verifyUser(req)
    if (!isString(suspensionDetails)) {
        res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
        return
    }

    // get the id (from the route name itself)
    id = req.params.id
    console.log(id);

    // add validation - ensure id is an integer (id might be 'script.js' sometimes)
    if (!isStringInteger(id) || parseInt(id) <= 0) {
        res.send({status: 'error', alert: 'Something went wrong when fetching the data from our servers. Please refresh the page and ensure that the URL path is typed in correctly. If the issue persists, please open a ticket to let me know.'});
        return
    }

    // get the user inputs
    x = req.body

    // isolate each field
    grantName = x.name.replace(/<[^>]*>/g, '');
    url = x.url.replace(/<[^>]*>/g, '');
    description = x.description.replace(/<[^>]*>/g, '');
    deadline = x.deadline.replace(/<[^>]*>/g, '');
    keywords = x.keywords.map(item => item.replace(/<[^>]*>/g, ''));
    researchers = x.researchers.map(item => item.replace(/<[^>]*>/g, ''));
    reason = x.reason.replace(/<[^>]*>/g, '');

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

    // get the grant information (to make versionInformation)
    const result = await queryWithRetry('SELECT * FROM grants WHERE "grantID" = $1', [id]);

    // ensure that the grant exists
    if (result.rows.length == 0) {
        res.send({alert: 'Something went wrong and we couldn\'t find the grant you were trying to edit. Please check that it exists. If this problem persists, please open a ticket and I will get this fixed ASAP.'});
        return
    }
    grant = result.rows[0]

    // get the previous version
    previousVersion = [JSON.stringify(grant.grantName), JSON.stringify(grant.url), JSON.stringify(grant.deadline), JSON.stringify(grant.duration), JSON.stringify(grant.description), JSON.stringify(grant.clusters), JSON.stringify(grant.keywords), JSON.stringify(grant.researchers), JSON.stringify(grant.matched), JSON.stringify(reason)]

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
}

// delete a grant
const deletegrantpost = async (req, res)=>{
    console.log("DELETE GRANT POST")

    // ensure that user is authenticated
    if (req.isAuthenticated() == false) {
        res.send({alert: 'Please login first :)'});
        return
    }

    // handle suspended users
    suspensionDetails = await verifyUser(req)
    if (!isString(suspensionDetails)) {
        res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
        return
    }

    // get the id (from the route name itself)
    id = req.params.id
    console.log(id);

    // add validation - ensure id is an integer (id might be 'script.js' sometimes)
    if (!isStringInteger(id) || parseInt(id) <= 0) {
        res.send({status: 'error', alert: 'Something went wrong when fetching the data from our servers. Please refresh the page and ensure that the URL path is typed in correctly. If the issue persists, please open a ticket to let me know.'});
        return
    }

    x = req.body

    // ensure that reason is provided
    if (!x.reason) {
        res.send({alert: 'It looks like no reason for grant deletion was provided. Please try again.'});
        return
    }

    reason = x.reason.replace(/<[^>]*>/g, '')

    // get the grants name
    const result = await queryWithRetry('SELECT "grantName" FROM grants WHERE "grantID" = $1', [id]);

    // ensure the grant exists
    if (result.rows.length == 0) {
        res.send({alert: 'Looks like your grant doesn\'t exist in the first place! Please try again.'})
        return
    }
    
    grantName = result.rows[0].grantName

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

    // add 'grant deleted' change to changelog
    const mq4 = 'INSERT INTO changelog ("changeID", "userEmail", "type", date, description, "excludedFromView") VALUES ($1, $2, $3, $4, $5, $6)'
    const result4 = await queryWithRetry(mq4, [nextChangeID, req.session.useremail, 'Grant Deleted', date, `The grant "${grantName}" has been deleted. The reason provided was "${reason}"`, '{}']);

    res.send({success: 'success'})
} 

// after a grant has been matched, update the database
const confirmmatchpost = async (req, res)=>{
    console.log("CONFIRM MATCH POST")

    // ensure that user is authenticated
    if (req.isAuthenticated() == false) {
        res.send({alert: 'Please login first :)'});
        return
    }

    // handle suspended users
    suspensionDetails = await verifyUser(req)
    if (!isString(suspensionDetails)) {
        res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
        return
    }

    // get the id (from the route name itself)
    id = req.params.id
    console.log(id);

    // add validation - ensure id is an integer (id might be 'script.js' sometimes)
    if (!isStringInteger(id) || parseInt(id) <= 0) {
        res.send({status: 'error', alert: 'Something went wrong when fetching the data from our servers. Please refresh the page and ensure that the URL path is typed in correctly. If the issue persists, please open a ticket to let me know.'});
        return
    }

    x = req.body
    console.log(x)

    // ensure that researcher names and emails are provided
    if (!x.researchersNames || !x.researchersEmails) {
        res.send({alert: 'It looks like no researchers were selected. Please try again.'});
        return
    }

    // get the researchers
    researchers = x.researchersNames.join(", ").replace(/<[^>]*>/g, '')
    researchersEmails = x.researchersEmails.map(item => item.replace(/<[^>]*>/g, ''));

    // get the grants name
    const result = await queryWithRetry('SELECT * FROM grants WHERE "grantID" = $1', [id]);

    // ensure the grant exists
    if (result.rows.length == 0) {
        res.send({alert: 'Looks like your grant doesn\'t exist in the first place! Please try again.'})
        return
    }

    grant = result.rows[0]

    // get the previous version
    previousVersion = [JSON.stringify(grant.grantName), JSON.stringify(grant.url), JSON.stringify(grant.deadline), JSON.stringify(grant.duration), JSON.stringify(grant.description), JSON.stringify(grant.clusters), JSON.stringify(grant.keywords), JSON.stringify(grant.researchers), JSON.stringify(grant.matched), JSON.stringify("This grant has been matched.")]

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
    const mq3 = 'UPDATE users SET xp = $1, "grantsMatched" = "grantsMatched" + 1 WHERE email = $2'
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

    // add 'grant matched' change to changelog
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

    // update the grants (due to matching)
    const mq6 =  'UPDATE grants SET matched = true, researchers = researchers || $1, "versionInformation" = $2 WHERE "grantID" = $3;'
    const result6 = await queryWithRetry(mq6, [researchersEmails, versionInformation, id]);

    res.send({success: 'success'})
} 

// add some clusters to the database (after recalculation)
const addclusterspost = async (req, res)=>{
    console.log("ADD CLUSTERS POST")

    // ensure that user is authenticated
    if (req.isAuthenticated() == false) {
        res.send({alert: 'Please login first :)'});
        return
    }

    // handle suspended users
    suspensionDetails = await verifyUser(req)
    if (!isString(suspensionDetails)) {
        res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
        return
    }

    x = req.body

    // ensure that clusters are provided
    if (!x.generatedClusters || x.generatedClusters == []) {
        res.send({alert: 'It looks like no clusters were selected. Please try again.'});
        return
    }

    generatedClusters = x.generatedClusters

        // get all clusters
    const result = await queryWithRetry('SELECT "clusterID" FROM clusters');

    // calculate the maximum clusterID
    maxClusterID = 0
    for (i in result.rows) {
        rowID = result.rows[i].clusterID
        if (rowID > maxClusterID) {
            maxClusterID = rowID
        }
    }

    // add each cluster to the database
    for (i in generatedClusters) {
        clusterName = generatedClusters[i].replace(/<[^>]*>/g, '')

        // add the cluster to the database
        await queryWithRetry('INSERT INTO clusters ("clusterID", name) VALUES ($1, $2)', [maxClusterID+1, clusterName]);
        
        // update cluster ID
        maxClusterID += 1
    }

    res.send({success: 'success'})
} 

// after the researchers have been recalculated, update the database (researcher table)
const confirmrecalculationpost = async (req, res)=>{
    console.log("CONFIRM RECALCULATION POST")

    // ensure that user is authenticated
    if (req.isAuthenticated() == false) {
        res.send({alert: 'Please login first :)'});
        return
    }

    // handle suspended users
    suspensionDetails = await verifyUser(req)
    if (!isString(suspensionDetails)) {
        res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
        return
    }

    x = req.body

    // ensure that researcher is provided
    if (!x.researcher || x.researcher == {}) {
        res.send({alert: 'It looks like no researchers were selected. Please try again.'});
        return
    }

    // get the current date
    now = new Date();

    // separate the parts of the date and ensure month and day are always two digits (e.g., 05 not 5)
    year = now.getFullYear()
    month = new Intl.DateTimeFormat('en', { month: '2-digit' }).format(now)
    day = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(now)

    // stringify it
    date = `${day}-${month}-${year}`

    // get all researcher data
    const result = await queryWithRetry('SELECT * FROM researchers');
    rows = result.rows

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
    const result2 = await queryWithRetry('SELECT * FROM clusters');

    // map the cluster name to ID
    for (i in result2.rows) {
        clusterDictionary[result2.rows[i].name] = result2.rows[i].clusterID
    }

    researcher = x.researcher

    // get the researcher's details
    researcherName = researcher.name.replace(/<[^>]*>/g, '')
    researcherEmail = researcher.email.replace(/<[^>]*>/g, '')
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
        previousVersion = [JSON.stringify(researcher.name), JSON.stringify(researcher.email), JSON.stringify(researcher.school), JSON.stringify(researcher.gender), JSON.stringify(researcher.publications), JSON.stringify(researcher.publicationKeywords), JSON.stringify(researcher.grants), JSON.stringify(researcher.grantKeywords), JSON.stringify(researcher.keywords), JSON.stringify(researcher.clusters), JSON.stringify(researcher.profile), JSON.stringify(researcher.activity), JSON.stringify(researcher.careerStage), JSON.stringify("This researcher's data has been recalculated.")]

        // add the date to the previous version
        previousVersion.push(date)
        // get the versioninformation list of the researcher
        versionInformation = prevResearcher.versionInformation
        // ensure that versionInformation is a list
        if (versionInformation == undefined || versionInformation == null) {
            versionInformation = []
        }
        // add it to the version information list
        versionInformation.push(previousVersion)

        await queryWithRetry('UPDATE researchers SET "versionInformation" = $1 WHERE email = $2;', [versionInformation, researcherEmail]);

        // update each piece of information to the database
        Object.entries(newResearcher).forEach(async ([column,newValue]) => {
            console.log(column, newValue)
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

                // remove html tags (prevent xss)
                if (Array.isArray(newValue)) {
                    newValue = newValue.filter(function(item) {
                        return item != undefined
                    });
                    newValue = newValue.map(item => item.toString().replace(/<[^>]*>/g, ''));
                } else if (typeof newValue === 'string') {
                    newValue = newValue.replace(/<[^>]*>/g, '')
                }
                
                if (column == 'clusters') {
                    // make sure clusters arent entirely overwritten
                    await queryWithRetry('UPDATE researchers SET clusters = clusters || $1 WHERE email = $2;', [newValue, researcherEmail]);
                } else {
                    // update that value
                    await queryWithRetry('UPDATE researchers SET "' + column + '" = $1 WHERE email = $2;', [newValue, researcherEmail]);
                }
            }
        })
    } else {
        // add the researcher
        await queryWithRetry('INSERT INTO researchers (email, name, school, gender, publications, "publicationKeywords", grants, "grantKeywords", keywords, clusters, profile, activity, "careerStage", "versionInformation", "dateAdded") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)', [researcherEmail, researcherName, '', 'U', [], [], [], [], [], [], '', 1, 0, [], date]);

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

                // remove html tags (prevent xss)
                if (Array.isArray(newValue)) {
                    newValue = newValue.filter(function(item) {
                        return item != undefined
                    });
                    console.log(newValue)
                    newValue = newValue.map(item => item.toString().replace(/<[^>]*>/g, ''));
                } else if (typeof newValue === 'string'){
                    newValue = newValue.replace(/<[^>]*>/g, '')
                }

                // update that value
                await queryWithRetry('UPDATE researchers SET "' + column + '" = $1 WHERE email = $2;', [newValue, researcherEmail]);
            }
        })
    }

    res.send({success: researcherName})
}

// after the researchers have been recalculated, update the database (changelog)
const concluderecalculationpost = async (req, res)=>{
    console.log("CONFIRM RECALCULATION POST")

    // ensure that user is authenticated
    if (req.isAuthenticated() == false) {
        res.send({alert: 'Please login first :)'});
        return
    }

    // handle suspended users
    suspensionDetails = await verifyUser(req)
    if (!isString(suspensionDetails)) {
        res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
        return
    }

    x = req.body

    // ensure that researchers names are provided
    if (!x.researchers || x.researchers == []) {
        res.send({alert: 'It looks like no researchers were selected. Please try again.'});
        return
    }

    // get researcher names
    researcherNames = x.researchers.join(", ").replace(/<[^>]*>/g, '')

    // get the current date
    now = new Date();

    // separate the parts of the date and ensure month and day are always two digits (e.g., 05 not 5)
    year = now.getFullYear()
    month = new Intl.DateTimeFormat('en', { month: '2-digit' }).format(now)
    day = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(now)

    // stringify it
    date = `${day}-${month}-${year}`

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

    // add 'researcher recalculated' change to changelog
    const mq5 = 'INSERT INTO changelog ("changeID", "userEmail", "type", date, description, "excludedFromView") VALUES ($1, $2, $3, $4, $5, $6)'
    const result5 = await queryWithRetry(mq5, [nextChangeID, req.session.useremail, 'Researcher Recalculated', date, `The following researchers had their data recalculated: ${researcherNames}`, '{}']);
    
    res.send({success: 'success'})
} 

// update the database when a code is added
const addcodepost = async (req, res)=>{
    console.log("ADD CODE POST")

    // only allow them to manage codes if they havent been authenticated yet
    if (!req.isAuthenticated()) {
        res.send({alert: 'Please login first :)'});
        return
    }

    // handle suspended users
    suspensionDetails = await verifyUser(req)
    if (!isString(suspensionDetails)) {
        res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
        return
    }

    // ensure that they are a manager/developer
    const result1 = await queryWithRetry('SELECT role FROM users WHERE email = $1', [req.session.useremail]);
    userRole = result1.rows[0].role

    // send error message if they have the incorrect roles
    if (!['manager', 'developer'].includes(userRole)) {
        res.send({alert: 'It looks like you aren\'t a manager/developer, so you aren\'t authorised to add codes.'})
        return
    }

    x = req.body
    console.log(x)

    if (!x.email || !x.code || !x.role) {
        res.send({alert: 'Please ensure that all inputs are filled in.'})
        return
    }

    email = x.email.replace(/<[^>]*>/g, '')
    code = x.code.replace(/<[^>]*>/g, '')
    role = x.role.replace(/<[^>]*>/g, '')

    // ensure code is correct length
    if (code.length != 8) {
        res.send({alert: 'Something went wrong. Please try regenerate the code. If this issue persists, please let me know.'})
        return
    }

    // get the current date
    now = new Date();

    // separate the parts of the date and ensure month and day are always two digits (e.g., 05 not 5)
    year = now.getFullYear()
    month = new Intl.DateTimeFormat('en', { month: '2-digit' }).format(now)
    day = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(now)

    // stringify it
    date = `${day}-${month}-${year}`

    // add the researcher
    await queryWithRetry('INSERT INTO codes ("userEmail", code, "role", "dateAdded") VALUES ($1, $2, $3, $4)', [email, code, role, date]);
    
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

    // add 'code added' change to changelog
    const mq5 = 'INSERT INTO changelog ("changeID", "userEmail", "type", date, description, "excludedFromView") VALUES ($1, $2, $3, $4, $5, $6)'
    const result5 = await queryWithRetry(mq5, [nextChangeID, req.session.useremail, 'Code Added', date, `A new code has been added for a new user with the email ${email}.`, '{}']);
    
    res.send({success: 'success'})
} 

// update the database when a code is removed
const removecodepost = async (req, res)=>{
    console.log("REMOVE CODE POST")

    // only allow them to manage codes if they havent been authenticated yet
    if (!req.isAuthenticated()) {
        res.send({alert: 'Please login first :)'});
        return
    }

    // handle suspended users
    suspensionDetails = await verifyUser(req)
    if (!isString(suspensionDetails)) {
        res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
        return
    }

    // ensure that they are a manager/developer
    const result1 = await queryWithRetry('SELECT role FROM users WHERE email = $1', [req.session.useremail]);
    userRole = result1.rows[0].role

    // send error message if they have the incorrect roles
    if (!['manager', 'developer'].includes(userRole)) {
        res.send({alert: 'It looks like you aren\'t a manager/developer, so you aren\'t authorised to remove codes.'})
        return
    }

    x = req.body
    console.log(x)

    if (!x.code) {
        res.send({alert: 'Please ensure that all inputs are filled in.'})
        return
    }

    code = x.code.replace(/<[^>]*>/g, '')

    // get the current date
    now = new Date();

    // separate the parts of the date and ensure month and day are always two digits (e.g., 05 not 5)
    year = now.getFullYear()
    month = new Intl.DateTimeFormat('en', { month: '2-digit' }).format(now)
    day = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(now)

    // stringify it
    date = `${day}-${month}-${year}`

    // try find the code
    const result2 = await queryWithRetry('SELECT "userEmail" FROM codes WHERE code = $1', [code]);
    codeToDelete = result2.rows

    // ensure that the code exists
    if (codeToDelete.length == 0) {
        res.send({alert: 'It looks like the code you want to delete doesn\'t exist. Please try again.'});
        return
    }

    // get the user email
    userEmail = codeToDelete.userEmail

    // remove the code
    await queryWithRetry('DELETE FROM codes WHERE code = $1', [code]);
    
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

    // add 'code deleted' change to changelog
    const mq5 = 'INSERT INTO changelog ("changeID", "userEmail", "type", date, description, "excludedFromView") VALUES ($1, $2, $3, $4, $5, $6)'
    const result5 = await queryWithRetry(mq5, [nextChangeID, req.session.useremail, 'Code Deleted', date, `The code for ${userEmail.replace(/<[^>]*>/g, '')} has been deleted.`, '{}']);
    
    res.send({success: 'success'})
} 

// delete a researcher
const deleteresearcherpost = async (req, res)=>{
    console.log("DELETE RESEARCHER POST")

    // ensure that user is authenticated
    if (req.isAuthenticated() == false) {
        res.send({alert: 'Please login first :)'});
        return
    }

    // handle suspended users
    suspensionDetails = await verifyUser(req)
    if (!isString(suspensionDetails)) {
        res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
        return
    }

    // get the id (from the route name itself)
    id = req.params.id
    console.log(id);

    x = req.body

    // ensure that reason is provided
    if (!x.reason) {
        res.send({alert: 'It looks like no reason for researcher deletion was provided. Please try again.'});
        return
    }

    reason = x.reason.replace(/<[^>]*>/g, '')

    // get the researcher's name
    const mq1 =  'SELECT "name" FROM researchers WHERE "email" = $1'
    const result1 = await queryWithRetry(mq1, [id]);

    // ensure that it exists
    if (result1.rows.length == 0) {
        res.send({alert: 'Looks like the researcher doesn\'t exist in the first place! Please try again.'})
        return
    }
    
    researcherName = result1.rows[0].name

    // remove the grant from the database
    const mq2 = 'DELETE FROM researchers WHERE "email" = $1'
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

    // add 'researcher deleted' change to changelog
    const mq4 = 'INSERT INTO changelog ("changeID", "userEmail", "type", date, description, "excludedFromView") VALUES ($1, $2, $3, $4, $5, $6)'
    const result4 = await queryWithRetry(mq4, [nextChangeID, req.session.useremail, 'Researcher Deleted', date, `The researcher "${researcherName}" has been deleted. The reason provided was "${reason}"`, '{}']);

    res.send({success: 'success'})
} 

// edit a researcher
const editresearcherpost = async (req, res)=>{
    console.log("EDIT RESEARCHER POST")

    // ensure that user is authenticated
    if (req.isAuthenticated() == false) {
        res.send({alert: 'Please login first :)'});
        return
    }

    // handle suspended users
    suspensionDetails = await verifyUser(req)
    if (!isString(suspensionDetails)) {
        res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
        return
    }

    // get the id (from the route name itself)
    id = req.params.id
    console.log(id);

    // get the user inputs
    x = req.body

    // isolate each field
    researcherName = x.name.replace(/<[^>]*>/g, '')
    email = x.email.replace(/<[^>]*>/g, '')
    school = x.school
    gender = x.gender
    careerStage = x.careerStage
    activity = x.activity.replace(/<[^>]*>/g, '')
    clusters = x.clusters
    profile = x.profile.replace(/<[^>]*>/g, '')
    keywords = x.keywords.map(item => item.replace(/<[^>]*>/g, ''));
    publications = x.publications.map(item => item.replace(/<[^>]*>/g, ''));
    publicationKeywords = x.publicationKeywords.map(item => item.replace(/<[^>]*>/g, ''));
    grants = x.grants.map(item => item.replace(/<[^>]*>/g, ''));
    grantKeywords = x.grantKeywords.map(item => item.replace(/<[^>]*>/g, ''));
    reason = x.reason.replace(/<[^>]*>/g, '')

    // parse the activity
    activity = parseFloat(activity)

    if (activity < 0 || activity > 1) {
        res.send({alert: 'The activity value is invalid. Please try again.'});
        return
    }
    
    // the clusters list will contain two lists - one is a list of names and the
    // other is a list of element IDs (from the DOM)
    clustersElementId = clusters[1]
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

    // ensure the dropdown inputs are valid
    if (!['F', 'M', 'U', 'N'].includes(gender)) {
        res.send({alert: 'The gender field is invalid. Please try again.'});
        return
    }

    if (!['1', '2', '3', '4'].includes(careerStage)) {
        res.send({alert: 'The career stage field is invalid. Please try again.'});
        return
    }

    if (!['geoscience', 'philosophy', 'chemistry', 'biology', 'mathematics', 'physics', 'psychology', 'veterinary'].includes(school)) {
        res.send({alert: 'The gender field is invalid. Please try again.'});
        return
    }

    // get the researcher information (to make versionInformation)
    const mq1 = 'SELECT * FROM researchers WHERE "email" = $1'
    const result1 = await queryWithRetry(mq1, [id]);

    // ensure that the grant exists
    if (result1.rows.length == 0) {
        res.send({alert: 'Something went wrong and we couldn\'t find the researcher you were trying to edit. Please check that it exists. If this problem persists, please open a ticket and I will get this fixed ASAP.'});
        return
    }
    researcher = result1.rows[0]

    // get the previous version
    previousVersion = [JSON.stringify(researcher.name), JSON.stringify(researcher.email), JSON.stringify(researcher.school), JSON.stringify(researcher.gender), JSON.stringify(researcher.publications), JSON.stringify(researcher.publicationKeywords), JSON.stringify(researcher.grants), JSON.stringify(researcher.grantKeywords), JSON.stringify(researcher.keywords), JSON.stringify(researcher.clusters), JSON.stringify(researcher.profile), JSON.stringify(researcher.activity), JSON.stringify(researcher.careerStage), JSON.stringify(reason)]

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

    // add it to the version information list
    versionInformation = researcher.versionInformation
    versionInformation.push(previousVersion)

    // add the researcher to researchers table
    const mq2 = 'UPDATE researchers SET name = $1, email = $2, school = $3, gender = $4, publications = $5, "publicationKeywords" = $6, grants = $7, "grantKeywords" = $8, keywords = $9, clusters = $10, activity = $11, "careerStage" = $12, "versionInformation" = $13 WHERE email = $14'
    const result2 = await queryWithRetry(mq2, [researcherName, email, school, gender, publications, publicationKeywords, grants, grantKeywords, keywords, clustersId, activity, careerStage, versionInformation, id]);
    
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

    // add 'researcher edited' change to changelog
    const mq4 = 'INSERT INTO changelog ("changeID", "userEmail", "type", date, description, "excludedFromView") VALUES ($1, $2, $3, $4, $5, $6)'
    const result4 = await queryWithRetry(mq4, [nextChangeID, req.session.useremail, 'Researcher Edited', date, `The researcher "${researcherName}" has been edited for reason "${reason}". Check it out now!`, '{}']);

    // redirect to the grant page
    res.send({"id": email})
}

// add a new researcher
const addresearcherpost = async (req, res)=>{
    console.log("ADD RESEARCHER POST")

    // get the user inputs
    x = req.body
    console.log(x)

    // ensure that user is authenticated
    if (req.isAuthenticated() == false) {
        res.send({alert: 'Please login first :)'});
        return
    }

    // handle suspended users
    suspensionDetails = await verifyUser(req)
    if (!isString(suspensionDetails)) {
        res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
        return
    }

    // isolate each field
    researcherName = x.name.replace(/<[^>]*>/g, '')
    email = x.email.replace(/<[^>]*>/g, '')
    gender = x.gender.replace(/<[^>]*>/g, '')
    school = x.school.replace(/<[^>]*>/g, '')
    career = x.career.replace(/<[^>]*>/g, '')
    activity = x.activity.replace(/<[^>]*>/g, '')
    profile = x.profile.replace(/<[^>]*>/g, '')

    keywords = x.keywords.map(item => item.replace(/<[^>]*>/g, ''));
    publications = x.publications.map(item => item.replace(/<[^>]*>/g, ''));
    publicationKeywords = x.publicationKeywords.map(item => item.replace(/<[^>]*>/g, ''));
    grants = x.grants.map(item => item.replace(/<[^>]*>/g, ''));
    grantKeywords = x.grantKeywords.map(item => item.replace(/<[^>]*>/g, ''));
    
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

    // ensure the dropdown inputs are valid
    if (!['F', 'M', 'U', 'N'].includes(gender)) {
        res.send({alert: 'The gender field is invalid. Please try again.'});
        return
    }

    if (!['1', '2', '3', '4'].includes(career)) {
        res.send({alert: 'The career stage field is invalid. Please try again.'});
        return
    }

    if (!['geoscience', 'philosophy', 'chemistry', 'biology', 'mathematics', 'physics', 'psychology', 'veterinary'].includes(school)) {
        res.send({alert: 'The gender field is invalid. Please try again.'});
        return
    }

    // get the current date
    now = new Date();

    // separate the parts of the date and ensure month and day are always two digits (e.g., 05 not 5)
    year = now.getFullYear()
    month = new Intl.DateTimeFormat('en', { month: '2-digit' }).format(now)
    day = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(now)

    // stringify it
    date = `${day}-${month}-${year}`

    // add the researcher to researchers table
    await queryWithRetry('INSERT INTO researchers (email, name, school, gender, publications, "publicationKeywords", grants, "grantKeywords", keywords, clusters, profile, activity, "careerStage", "versionInformation", "dateAdded") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)', [email, researcherName, school, gender, publications, publicationKeywords, grants, grantKeywords, keywords, clustersId, profile, activity, career, [], date]);
    
    // get all changes
    const result = await queryWithRetry('SELECT "changeID" FROM changelog');

    // calculate the maximum changeID
    maxChangeID = 0
    for (x in result.rows) {
        rowID = result.rows[x].changeID
        if (rowID > maxChangeID) {
            maxChangeID = rowID
        }
    }

    // calculate the next change ID
    nextChangeID = maxChangeID + 1

    // add 'researcher added' change to changelog
    const mq2 = 'INSERT INTO changelog ("changeID", "userEmail", "type", date, description, "excludedFromView") VALUES ($1, $2, $3, $4, $5, $6)'
    await queryWithRetry(mq2, [nextChangeID, req.session.useremail, 'Researcher Added', date, `The researcher "${researcherName}" has been added. Check it out now!`, '{}']);

    // redirect to the researcher page
    res.send({"id": email})
} 

// update the clusters table
const manageclusterspost = async (req, res)=>{
    console.log("MANAGE CLUSTERS POST")

    // ensure that user is authenticated
    if (req.isAuthenticated() == false) {
        res.send({alert: 'Please login first :)'});
        return
    }

    // handle suspended users
    suspensionDetails = await verifyUser(req)
    if (!isString(suspensionDetails)) {
        res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
        return
    }

    x = req.body
    console.log(x)

    // ensure that clusters are provided
    if (!x.clusters || x.clusters.length != 2) {
        res.send({alert: 'It looks like no clusters were selected or they were invalid. Please try again.'});
        return
    }

    // these two correspond with each other in a one-to-one relationship
    inputClusterNames = x.clusters[0].map(item => item.replace(/<[^>]*>/g, ''));
    inputClusterIds = x.clusters[1].map(item => parseInt(item));

    // get the current date
    now = new Date();

    // separate the parts of the date and ensure month and day are always two digits (e.g., 05 not 5)
    year = now.getFullYear()
    month = new Intl.DateTimeFormat('en', { month: '2-digit' }).format(now)
    day = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(now)

    // stringify it
    date = `${day}-${month}-${year}`

    // get all clusters
    const result = await queryWithRetry('SELECT * FROM clusters');
    allClusters = result.rows

    // get all cluster IDs
    allClusterIds = []
    for (i in allClusters) {
        allClusterIds.push(allClusters[i].clusterID)
    }

    clustersAdded = 0
    clustersDeleted = 0
    clustersEdited = 0

    // iterate over each inputted cluster
    for (i in inputClusterIds) {
        clusterId = inputClusterIds[i]
        clusterName = inputClusterNames[i]
        // deal with the case where a new cluster is added
        if (!allClusterIds.includes(clusterId)) {
            // add the cluster to the database
            await queryWithRetry('INSERT INTO clusters ("clusterID", name) VALUES ($1, $2)', [clusterId, clusterName]);
            clustersAdded ++;
        // deal with the edit case
        } else {
            console.log(clusterId, clusterName)
            await queryWithRetry('UPDATE clusters SET name = $1 WHERE "clusterID" = $2', [clusterName, clusterId]);
            clustersEdited ++;
        }
    }

    // iterate over each cluster
    for (i in allClusters) {
        cluster = allClusters[i]
        // deal with the case where an old cluster is deleted
        if (!inputClusterIds.includes(cluster.clusterID)) {
            // remove the cluster from the database
            await queryWithRetry('DELETE FROM clusters WHERE "clusterID" = $1', [cluster.clusterID]);
            // remove clusters from researchers and grants
            await queryWithRetry('UPDATE researchers SET clusters = ARRAY_REMOVE(clusters, $1)', [cluster.clusterID]);
            await queryWithRetry('UPDATE grants SET clusters = ARRAY_REMOVE(clusters, $1)', [cluster.clusterID]);
            // increment counter
            clustersDeleted ++;
        }
    }

    // get all changes
    const result2 = await queryWithRetry('SELECT "changeID" FROM changelog');

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

    //update changelog
    await queryWithRetry('INSERT INTO changelog ("changeID", "userEmail", "type", date, description, "excludedFromView") VALUES ($1, $2, $3, $4, $5, $6)', [nextChangeID, req.session.useremail, 'Clusters Edited', date, `${clustersAdded} clusters were added, ${clustersEdited} clusters were edited, and ${clustersDeleted} clusters were deleted.`, '{}']);

    res.send({success: 'success'})
} 

// add a ticket
const addticketpost = async (req, res)=>{
    console.log("ADD TICKET POST")

    x = req.body
    console.log(x)

    // only allow them to see tickets if they have been authenticated
    if (req.isAuthenticated()) {
        // handle suspended users
        suspensionDetails = await verifyUser(req)
        if (!isString(suspensionDetails)) {
            res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
            return
        }

        // get the current date
        now = new Date();

        // separate the parts of the date and ensure month and day are always two digits (e.g., 05 not 5)
        year = now.getFullYear()
        month = new Intl.DateTimeFormat('en', { month: '2-digit' }).format(now)
        day = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(now)

        // stringify it
        date = `${day}-${month}-${year}`

        // ensure all fields exist
        if (!x.title || !x.tags || !x.members || !x.content) {
            res.send({status: 'error', alert: 'It looks like some fields are missing. If this issue persists, please let me know at flyingbutter213@gmail.com.'})
            return
        }

        title = x.title.replace(/<[^>]*>/g, '')
        content = x.content.replace(/<[^>]*>/g, '')
        members = x.members
        tags = x.tags

        // ensure title and content arent empty
        if (title.trim() == '' || content.trim() == '') {
            res.send({status: 'error', alert: 'Please make sure you filled in all the fields!'})
            return
        }

        // add the developer to the members list if not in there already
        if (!members.includes(developerEmail)) {
            members.push(developerEmail)
        }

        // add the user to the members list if not in there already
        if (!members.includes(req.session.useremail)) {
            members.push(req.session.useremail)
        }

        // ensure each item in tags is valid
        for (i in tags) {
            if (!['bug', 'feedback', 'inquiry', 'report', 'help', 'other'].includes(x.tags[i])) {
                res.send({status: 'error', alert: 'Your tags are invalid. Please retry.'})
                return
            }
        }

        // get a list of all users
        excludedUsers = await users_list()
        for (i in excludedUsers) {
            excludedUsers[i] = excludedUsers[i].email
        }

        // ensure each email in members is valid
        for (i in members) {
            index = excludedUsers.indexOf(members[i]) // get index of user
            if (index == -1) {
                res.send({status: 'error', alert: 'Your members list is invalid. Please retry.'})
                return
            }

            excludedUsers.splice(index, 1) // remove from excluded users (because if this user is in members, they arent excluded from view)
        }

        console.log(excludedUsers)

        // get all ticket IDs
        const result = await queryWithRetry('SELECT "ticketID" FROM tickets');
        allTickets = result.rows

        // get the maximum ticket ID
        maxTicketID = 9
        for (i in allTickets) {
            if (allTickets[i].ticketID > maxTicketID) {
                maxTicketID = allTickets[i].ticketID
            }
        }

        // add ticket to database
        await queryWithRetry('INSERT INTO tickets ("ticketID", "userEmail", "ticketDate", title, content, members, tags, replies, "resolutionDetails", "versionInformation") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', [maxTicketID+1, req.session.useremail, date, title, content, members, tags, [], [], []])

        // get all changes
        const result2 = await queryWithRetry('SELECT "changeID" FROM changelog');

        // calculate the maximum changeID
        maxChangeID = 0
        for (i in result2.rows) {
            rowID = result2.rows[i].changeID
            if (rowID > maxChangeID) {
                maxChangeID = rowID
            }
        }

        // calculate the next change ID
        nextChangeID = maxChangeID + 1

        //update changelog
        await queryWithRetry('INSERT INTO changelog ("changeID", "userEmail", "type", date, description, "excludedFromView") VALUES ($1, $2, $3, $4, $5, $6)', [nextChangeID, req.session.useremail, 'Ticket Created', date, `A ticket called "${title}" has been created by ${req.session.useremail}. Check it out now!`, excludedUsers]);

        res.send({id: maxTicketID+1});
    } else {
        urlinit = '/tickets' // redirect them to the current url after they logged in
        res.render('login.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedOut, urlinit: urlinit});
    }
} 

// add a reply to the ticket
const addreplypost = async (req, res)=>{
    console.log("ADD TICKET REPLY POST")

    x = req.body
    console.log(x)

    // only allow them to see tickets if they have been authenticated
    if (req.isAuthenticated()) {
        // handle suspended users
        suspensionDetails = await verifyUser(req)
        if (!isString(suspensionDetails)) {
            res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
            return
        }

        // get the current date
        now = new Date();

        // separate the parts of the date and ensure month and day are always two digits (e.g., 05 not 5)
        year = now.getFullYear()
        month = new Intl.DateTimeFormat('en', { month: '2-digit' }).format(now)
        day = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(now)

        // stringify it
        date = `${day}-${month}-${year}`

        // ensure all fields exist
        if (!x.content || x.content.replace(/<[^>]*>/g, '').trim() == '') {
            res.send({status: 'error', alert: 'It looks like the reply content is missing / empty. If this issue persists, please let me know at flyingbutter213@gmail.com.'})
            return
        }

        content = x.content.replace(/<[^>]*>/g, '')

        if (!x.id || !isStringInteger(x.id) || x.id < 0) {
            res.send({status: 'error', alert: 'It looks like the ticket details are missing or invalid. If this issue persists, please let me know at flyingbutter213@gmail.com.'})
            return
        }

        id = parseInt(x.id)

        // get ticket info
        ticket = await queryWithRetry('SELECT * FROM tickets WHERE "ticketID" = $1', [id])
        ticket = ticket.rows

        // ensure ticket exists
        if (ticket.length == 0) {
            res.send({status: 'error', alert: 'Something went wrong when fetching the data from our servers. Please refresh the page and ensure that the URL path is typed in correctly. If the issue persists, please open a ticket to let me know.'});
            return
        }

        ticket = ticket[0]

        // ensure ticket hasnt already been resolved
        if (ticket.resolutionDetails.length > 0) {
            res.send({status: 'error', alert: 'This ticket has been resolved so it is locked and no new changes can be made.'})
            return
        }

        // ensure that user is in ticket members
        if (!ticket.members.includes(req.session.useremail)) {
            res.send({status: 'error', alert: 'You are not a member of the ticket so you cannot add replies to it.'});
            return
        }

        // get a list of all users
        excludedUsers = await users_list()
        for (i in excludedUsers) {
            excludedUsers[i] = excludedUsers[i].email
        }

        // remove the members from the list of excluded users
        for (i in ticket.members) {
            index = excludedUsers.indexOf(ticket.members[i]) // get index of user
            if (index != -1) {
                excludedUsers.splice(index, 1) // remove from excluded users (because if this user is in members, they arent excluded from view)
            }
        }

        console.log(excludedUsers)

        // get all replies
        replies = await queryWithRetry('SELECT "replyID" FROM replies')
        replies = replies.rows

        maxReplyID = 0
        
        // get the max reply ID
        for (r in replies) {
            if (replies[r].replyID > maxReplyID) {
                maxReplyID = replies[r].replyID
            }
        }

        // insert the new reply into the table
        await queryWithRetry('INSERT INTO replies ("ticketID", "replyID", "replyDate", "userEmail", content, "versionInformation") VALUES ($1, $2, $3, $4, $5, $6)', [id, maxReplyID+1, date, req.session.useremail, content, []])

        // add reply id to ticket
        await queryWithRetry('UPDATE tickets SET replies = replies || $1 WHERE "ticketID" = $2', [[maxReplyID+1], id])

        // get all changes
        const result = await queryWithRetry('SELECT "changeID" FROM changelog');

        // calculate the maximum changeID
        maxChangeID = 0
        for (i in result.rows) {
            rowID = result.rows[i].changeID
            if (rowID > maxChangeID) {
                maxChangeID = rowID
            }
        }

        // calculate the next change ID
        nextChangeID = maxChangeID + 1

        //update changelog
        await queryWithRetry('INSERT INTO changelog ("changeID", "userEmail", "type", date, description, "excludedFromView") VALUES ($1, $2, $3, $4, $5, $6)', [nextChangeID, req.session.useremail, 'Ticket Replied To', date, `A ticket called "${ticket.title.replace(/<[^>]*>/g, '')}" has been replied to by ${req.session.username}. Check it out now!`, excludedUsers]);

        res.send({status: 'success'});
    } else {
        urlinit = '/tickets' // redirect them to the current url after they logged in
        res.render('login.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedOut, urlinit: urlinit});
    }
} 

// edit a ticket reply
const editreplypost = async (req, res)=>{
    console.log("EDIT TICKET REPLY POST")

    x = req.body
    console.log(x)

    // only allow them to see tickets if they have been authenticated
    if (req.isAuthenticated()) {
        // handle suspended users
        suspensionDetails = await verifyUser(req)
        if (!isString(suspensionDetails)) {
            res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
            return
        }

        // get the current date
        now = new Date();

        // separate the parts of the date and ensure month and day are always two digits (e.g., 05 not 5)
        year = now.getFullYear()
        month = new Intl.DateTimeFormat('en', { month: '2-digit' }).format(now)
        day = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(now)

        // stringify it
        date = `${day}-${month}-${year}`

        // ensure all fields exist
        if (!x.content || x.content.replace(/<[^>]*>/g, '').trim() == '') {
            res.send({status: 'error', alert: 'It looks like the reply content is missing / empty. If this issue persists, please let me know at flyingbutter213@gmail.com.'})
            return
        }

        content = x.content.replace(/<[^>]*>/g, '')

        if (!x.reason || x.reason.replace(/<[^>]*>/g, '').trim() == '') {
            res.send({status: 'error', alert: 'It looks like the edit reason is missing / empty. If this issue persists, please let me know at flyingbutter213@gmail.com.'})
            return
        }

        reason = x.reason.replace(/<[^>]*>/g, '')

        if (!x.id || !isStringInteger(x.id) || x.id < 0) {
            res.send({status: 'error', alert: 'It looks like the reply details are missing or invalid. If this issue persists, please let me know at flyingbutter213@gmail.com.'})
            return
        }

        id = parseInt(x.id)

        // get reply info
        reply = await queryWithRetry('SELECT * FROM replies WHERE "replyID" = $1', [id])
        reply = reply.rows

        // ensure reply exists
        if (reply.length == 0) {
            res.send({status: 'error', alert: 'Something went wrong when fetching the data from our servers. Please refresh the page and ensure that the URL path is typed in correctly. If the issue persists, please open a ticket to let me know.'});
            return
        }

        reply = reply[0]
        ticketID = reply.ticketID

        // get ticket info
        ticket = await queryWithRetry('SELECT * FROM tickets WHERE "ticketID" = $1', [reply.ticketID])
        ticket = ticket.rows

        // ensure ticket exists
        if (ticket.length == 0) {
            res.send({status: 'error', alert: 'Something went wrong when fetching the data from our servers. Please refresh the page and ensure that the URL path is typed in correctly. If the issue persists, please open a ticket to let me know.'});
            return
        }

        ticket = ticket[0]

        // ensure ticket hasnt already been resolved
        if (ticket.resolutionDetails.length > 0) {
            res.send({status: 'error', alert: 'This ticket has been resolved so it is locked and no new changes can be made.'})
            return
        }

        // ensure that user is in ticket members
        if (!ticket.members.includes(req.session.useremail)) {
            res.send({status: 'error', alert: 'You are not a member of the ticket so you cannot add replies to it.'});
            return
        }

        // get a list of all users
        excludedUsers = await users_list()
        for (i in excludedUsers) {
            excludedUsers[i] = excludedUsers[i].email
        }

        // remove the members from the list of excluded users
        for (i in ticket.members) {
            index = excludedUsers.indexOf(ticket.members[i]) // get index of user
            if (index != -1) {
                excludedUsers.splice(index, 1) // remove from excluded users (because if this user is in members, they arent excluded from view)
            }
        }

        console.log(excludedUsers)

        // get the previous version
        previousVersion = [reply.content, reason, date]

        // update version information
        versionInformation = reply.versionInformation
        versionInformation.push(previousVersion)

        // update the table
        await queryWithRetry('UPDATE replies SET content = $1, "versionInformation" = $2 WHERE "replyID" = $3', [content, versionInformation, id])

        // get all changes
        const result = await queryWithRetry('SELECT "changeID" FROM changelog');

        // calculate the maximum changeID
        maxChangeID = 0
        for (i in result.rows) {
            rowID = result.rows[i].changeID
            if (rowID > maxChangeID) {
                maxChangeID = rowID
            }
        }

        // calculate the next change ID
        nextChangeID = maxChangeID + 1

        //update changelog
        await queryWithRetry('INSERT INTO changelog ("changeID", "userEmail", "type", date, description, "excludedFromView") VALUES ($1, $2, $3, $4, $5, $6)', [nextChangeID, req.session.useremail, 'Ticket Reply Edited', date, `A reply in a ticket called "${ticket.title}" has been edited by ${req.session.username} for the reason: ${reason}`, excludedUsers]);

        res.send({status: 'success'});
    } else {
        urlinit = '/tickets' // redirect them to the current url after they logged in
        res.render('login.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedOut, urlinit: urlinit});
    }
} 

// add a ticket
const editticketpost = async (req, res)=>{
    console.log("EDIT TICKET POST")

    x = req.body
    console.log(x)

    // only allow them to see tickets if they have been authenticated
    if (req.isAuthenticated()) {
        // handle suspended users
        suspensionDetails = await verifyUser(req)
        if (!isString(suspensionDetails)) {
            res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
            return
        }

        // get the current date
        now = new Date();

        // separate the parts of the date and ensure month and day are always two digits (e.g., 05 not 5)
        year = now.getFullYear()
        month = new Intl.DateTimeFormat('en', { month: '2-digit' }).format(now)
        day = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(now)

        // stringify it
        date = `${day}-${month}-${year}`

        // ensure all fields exist
        if (!x.title || !x.tags || !x.members || !x.content || !x.reason || !x.id) {
            res.send({status: 'error', alert: 'It looks like some fields are missing. If this issue persists, please let me know at flyingbutter213@gmail.com.'})
            return
        }

        // ensure title and content arent empty
        if (x.title.replace(/<[^>]*>/g, '').trim() == '' || x.content.replace(/<[^>]*>/g, '').trim() == '' || x.reason.replace(/<[^>]*>/g, '').trim() == '') {
            res.send({status: 'error', alert: 'Please make sure you filled in all the fields!'})
            return
        }

        title = x.title.replace(/<[^>]*>/g, '')
        content = x.content.replace(/<[^>]*>/g, '')
        reason = x.reason.replace(/<[^>]*>/g, '')
        members = x.members
        tags = x.tags
        id = x.id

        // add the developer to the members list if not in there already
        if (!members.includes(developerEmail)) {
            members.push(developerEmail)
        }

        // add the user to the members list if not in there already
        if (!members.includes(req.session.useremail)) {
            members.push(req.session.useremail)
        }

        // ensure each item in tags is valid
        for (i in tags) {
            if (!['bug', 'feedback', 'inquiry', 'report', 'help', 'other'].includes(tags[i])) {
                res.send({status: 'error', alert: 'Your tags are invalid. Please retry.'})
                return
            }
        }

        // get a list of all users
        excludedUsers = await users_list()
        for (i in excludedUsers) {
            excludedUsers[i] = excludedUsers[i].email
        }

        // ensure each email in members is valid
        for (i in members) {
            index = excludedUsers.indexOf(members[i]) // get index of user
            if (index == -1) {
                res.send({status: 'error', alert: 'Your members list is invalid. Please retry.'})
                return
            }

            excludedUsers.splice(index, 1) // remove from excluded users (because if this user is in members, they arent excluded from view)
        }

        console.log(excludedUsers)

        // get ticket info
        ticket = await queryWithRetry('SELECT * FROM tickets WHERE "ticketID" = $1', [id])
        ticket = ticket.rows

        // ensure ticket exists
        if (ticket.length == 0) {
            res.send({status: 'error', alert: 'Something went wrong when fetching the data from our servers. Please refresh the page and ensure that the URL path is typed in correctly. If the issue persists, please open a ticket to let me know.'});
            return
        }

        ticket = ticket[0]

        // ensure ticket hasnt already been resolved
        if (ticket.resolutionDetails.length > 0) {
            res.send({status: 'error', alert: 'This ticket has been resolved so it is locked and no new changes can be made.'})
            return
        }

        // ensure that user is in ticket members
        if (!ticket.members.includes(req.session.useremail)) {
            res.send({status: 'error', alert: 'You are not a member of the ticket so you cannot add replies to it.'});
            return
        }

        // get previous version
        previousVersion = [ticket.title, ticket.content, JSON.stringify(ticket.members), JSON.stringify(ticket.tags), JSON.stringify(ticket.resolutionDetails), reason, date]

        // handle version information
        versionInformation = ticket.versionInformation
        versionInformation.push(previousVersion)

        // update ticket
        await queryWithRetry('UPDATE tickets SET title = $1, content = $2, members = $3, tags = $4, "versionInformation" = $5 WHERE "ticketID" = $6', [title, content, members, tags, versionInformation, id])
        
        // get all changes
        const result = await queryWithRetry('SELECT "changeID" FROM changelog');

        // calculate the maximum changeID
        maxChangeID = 0
        for (i in result.rows) {
            rowID = result.rows[i].changeID
            if (rowID > maxChangeID) {
                maxChangeID = rowID
            }
        }

        // calculate the next change ID
        nextChangeID = maxChangeID + 1

        //update changelog
        await queryWithRetry('INSERT INTO changelog ("changeID", "userEmail", "type", date, description, "excludedFromView") VALUES ($1, $2, $3, $4, $5, $6)', [nextChangeID, req.session.useremail, 'Ticket Edited', date, `A ticket called "${title}" has been edited by ${req.session.useremail}. Check it out now!`, excludedUsers]);

        res.send({status: 'success'});
    } else {
        urlinit = '/tickets' // redirect them to the current url after they logged in
        res.render('login.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedOut, urlinit: urlinit});
    }
} 

// resolve a ticket
const resolvepost = async (req, res)=>{
    console.log("RESOLVE TICKET POST")

    x = req.body
    console.log(x)

    // only allow them to see tickets if they have been authenticated
    if (req.isAuthenticated()) {
        // handle suspended users
        suspensionDetails = await verifyUser(req)
        if (!isString(suspensionDetails)) {
            res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
            return
        }

        // get the current date
        now = new Date();

        // separate the parts of the date and ensure month and day are always two digits (e.g., 05 not 5)
        year = now.getFullYear()
        month = new Intl.DateTimeFormat('en', { month: '2-digit' }).format(now)
        day = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(now)

        // stringify it
        date = `${day}-${month}-${year}`
        console.log(x.id)

        // ensure all fields exist
        if (!x.reason || !x.reply || !x.user || !x.id) {
            res.send({status: 'error', alert: 'It looks like some fields are missing. If this issue persists, please let me know at flyingbutter213@gmail.com.'})
            return
        }
        
        id = x.id

        // ensure title and content arent empty
        if (x.reason.replace(/<[^>]*>/g, '').trim() == '' || x.reply == '' || x.user == '') {
            res.send({status: 'error', alert: 'Please make sure you filled in all the fields!'})
            return
        }

        reason = x.reason.replace(/<[^>]*>/g, '')
        reply = x.reply
        user = x.user

        if (await get_user_by_email(user) == undefined) {
            res.send({status: 'error', alert: 'The most helpful user field is invalid. Please retry.'})
            return
        }

        // get ticket info
        ticket = await queryWithRetry('SELECT * FROM tickets WHERE "ticketID" = $1', [id])
        ticket = ticket.rows

        // ensure ticket exists
        if (ticket.length == 0) {
            res.send({status: 'error', alert: 'Something went wrong when fetching the data from our servers. Please refresh the page and ensure that the URL path is typed in correctly. If the issue persists, please open a ticket to let me know.'});
            return
        }

        ticket = ticket[0]

        // ensure ticket hasnt already been resolved
        if (ticket.length == 0) {
            res.send({status: 'error', alert: 'Something went wrong when fetching the data from our servers. Please refresh the page and ensure that the URL path is typed in correctly. If the issue persists, please open a ticket to let me know.'});
            return
        }

        // ensure ticket hasnt already been resolved
        if (ticket.resolutionDetails.length > 0) {
            res.send({status: 'error', alert: 'This ticket has already been resolved.'})
            return
        }

        // ensure that user is in ticket members
        if (!ticket.members.includes(req.session.useremail)) {
            res.send({status: 'error', alert: 'You are not a member of the ticket so you cannot add replies to it.'});
            return
        }

        // ensure most helpful reply is valid
        if (!ticket.replies.includes(parseInt(reply))) {
            res.send({status: 'error', alert: 'The most helpful reply field is invalid. Please retry.'})
            return
        }

        // get a list of all users
        excludedUsers = await users_list()
        for (i in excludedUsers) {
            excludedUsers[i] = excludedUsers[i].email
        }

        // remove ticket.members from excludedUsers
        for (i in ticket.members) {
            index = excludedUsers.indexOf(ticket.members[i]) // get index of user
            excludedUsers.splice(index, 1) // remove from excluded users (because if this user is in ticket.members, they arent excluded from view)
        }

        console.log(excludedUsers)

        // get the resolution details
        resolutionDetails = [reason, reply, user, date]

        // update ticket
        await queryWithRetry('UPDATE tickets SET "resolutionDetails" = $1 WHERE "ticketID" = $2', [resolutionDetails, id])
        
        // get all changes
        const result = await queryWithRetry('SELECT "changeID" FROM changelog');

        // calculate the maximum changeID
        maxChangeID = 0
        for (i in result.rows) {
            rowID = result.rows[i].changeID
            if (rowID > maxChangeID) {
                maxChangeID = rowID
            }
        }

        // calculate the next change ID
        nextChangeID = maxChangeID + 1

        //update changelog
        await queryWithRetry('INSERT INTO changelog ("changeID", "userEmail", "type", date, description, "excludedFromView") VALUES ($1, $2, $3, $4, $5, $6)', [nextChangeID, req.session.useremail, 'Ticket Resolved', date, `A ticket called "${ticket.title}" has been resolved by ${req.session.useremail}. Check it out now!`, excludedUsers]);

        res.send({status: 'success'});
    } else {
        urlinit = '/tickets' // redirect them to the current url after they logged in
        res.render('login.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedOut, urlinit: urlinit});
    }
} 

// change username
const changenamepost = async (req, res)=>{
    console.log("CHANGE NAME POST")

    x = req.body
    console.log(x)

    // only allow them to see tickets if they have been authenticated
    if (req.isAuthenticated()) {
        // handle suspended users
        suspensionDetails = await verifyUser(req)
        if (!isString(suspensionDetails)) {
            res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
            return
        }

        // get the current date
        now = new Date();

        // separate the parts of the date and ensure month and day are always two digits (e.g., 05 not 5)
        year = now.getFullYear()
        month = new Intl.DateTimeFormat('en', { month: '2-digit' }).format(now)
        day = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(now)

        // stringify it
        date = `${day}-${month}-${year}`

        // ensure all fields exist
        if (!x.name || x.name.trim() == '' || x.name.length < 5) {
            res.send({status: 'error', alert: 'It looks like the name field is missing or too short. If this issue persists, please let me know at flyingbutter213@gmail.com.'})
            return
        }
        
        username = x.name.replace(/<[^>]*>/g, '')

        // if the name change is the user themselves
        if (!x.email) {
            email = req.session.useremail

            // get user info
            user = await get_user_by_email(email)

            // ensure user exists
            if (user == undefined) {
                res.send({status: 'error', alert: 'We couldn\'t find your account. Please refresh the page and ensure that the URL path is typed in correctly. If the issue persists, please open a ticket to let me know.'});
                return
            }

            editingUser = undefined
        // if the name change is coming from somebody else
        } else {
            email = x.email

            // ensure that a reason is provided
            if (!x.reason || x.reason.trim() == '' || x.reason.length < 5) {
                res.send({status: 'error', alert: 'It looks like the reason field is missing or too short. If this issue persists, please let me know at flyingbutter213@gmail.com.'})
                return
            }

            reason = x.reason.trim().replace(/<[^>]*>/g, '')
            
            // get user info
            user = await get_user_by_email(email)

            // ensure user exists
            if (user == undefined) {
                res.send({status: 'error', alert: 'We couldn\'t find the account of the user you want to edit. Please refresh the page and ensure that the URL path is typed in correctly. If the issue persists, please open a ticket to let me know.'});
                return
            }

            // get info of the user who is making the post request
            editingUserEmail = req.session.useremail
            editingUser = await get_user_by_email(editingUserEmail)

            // ensure that the user is a manager/dev
            if (!editingUser || !['manager', 'developer'].includes(editingUser.role)) {
                res.send({status: 'error', alert: 'It looks like you aren\'t a manager or a developer, so you aren\'t authorized to edit the details of other users.'})
                return
            }
        }

        // store the old name
        oldName = user.name

        // update the user
        await queryWithRetry('UPDATE users SET name = $1 WHERE email = $2', [username, email])

        // get all changes
        const result = await queryWithRetry('SELECT "changeID" FROM changelog');

        // calculate the maximum changeID
        maxChangeID = 0
        for (i in result.rows) {
            rowID = result.rows[i].changeID
            if (rowID > maxChangeID) {
                maxChangeID = rowID
            }
        }

        // calculate the next change ID
        nextChangeID = maxChangeID + 1

        //update changelog

        // user is editing their own account
        if (!editingUser) {
            await queryWithRetry('INSERT INTO changelog ("changeID", "userEmail", "type", date, description, "excludedFromView") VALUES ($1, $2, $3, $4, $5, $6)', [nextChangeID, email, 'User Edited', date, `${oldName} changed their name to ${username}`, []]);
        // the name change is coming from somebody else
        } else {
            await queryWithRetry('INSERT INTO changelog ("changeID", "userEmail", "type", date, description, "excludedFromView") VALUES ($1, $2, $3, $4, $5, $6)', [nextChangeID, editingUserEmail, 'User Edited', date, `${editingUser.name} changed ${oldName}\'s name to ${username} for reason: "${reason}"`, []]);
        }
        
        res.send({status: 'success'});
    } else {
        urlinit = '/profile' // redirect them to the current url after they logged in
        res.render('login.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedOut, urlinit: urlinit});
    }
} 

// change password
const changepasswordpost = async (req, res)=>{
    console.log("CHANGE PASSWORD POST")

    x = req.body
    console.log(x)

    // only allow them to see tickets if they have been authenticated
    if (req.isAuthenticated()) {
        // handle suspended users
        suspensionDetails = await verifyUser(req)
        if (!isString(suspensionDetails)) {
            res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
            return
        }

        // get the current date
        now = new Date();

        // separate the parts of the date and ensure month and day are always two digits (e.g., 05 not 5)
        year = now.getFullYear()
        month = new Intl.DateTimeFormat('en', { month: '2-digit' }).format(now)
        day = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(now)

        // stringify it
        date = `${day}-${month}-${year}`

        // ensure all fields exist
        if (!x.newPassword || x.oldPassword.trim() == '' || x.newPassword.length < 5) {
            res.send({status: 'error', alert: 'It looks like some fields are missing or too short. If this issue persists, please let me know at flyingbutter213@gmail.com.'})
            return
        }
        
        newPassword = x.newPassword.replace(/<[^>]*>/g, '')

        // hash the passwords
        newPassword = MD5(newPassword.trim() + process.env.PASSWORD_SALT).toString();
        oldPassword = MD5(x.oldPassword.trim() + process.env.PASSWORD_SALT).toString();

        email = req.session.useremail

        // get user info
        user = await get_user_by_email(email)

        // ensure user exists
        if (user == undefined) {
            res.send({status: 'error', alert: 'We couldn\'t find your account. Please refresh the page and ensure that the URL path is typed in correctly. If the issue persists, please open a ticket to let me know.'});
            return
        }

        console.log(user)

        // ensure that old password is correct
        if (user.password != oldPassword) {
            res.send({status: 'error', alert: 'Your current password is incorrect. Please make sure you have typed it in properly.'});
            return
        }

        // update the user
        await queryWithRetry('UPDATE users SET password = $1 WHERE email = $2', [newPassword, email])

        // dont add to changelog :)

        res.send({status: 'success'});
    } else {
        urlinit = '/profile' // redirect them to the current url after they logged in
        res.render('login.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedOut, urlinit: urlinit});
    }
} 

// delete the user's account
const deleteaccountpost = async (req, res)=>{
   console.log("DELETE ACCOUNT POST")

    x = req.body
    console.log(x)

    // only allow them to see tickets if they have been authenticated
    if (req.isAuthenticated()) {
        // handle suspended users
        suspensionDetails = await verifyUser(req)
        if (!isString(suspensionDetails)) {
            res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
            return
        }

        // get the current date
        now = new Date();

        // separate the parts of the date and ensure month and day are always two digits (e.g., 05 not 5)
        year = now.getFullYear()
        month = new Intl.DateTimeFormat('en', { month: '2-digit' }).format(now)
        day = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(now)

        // stringify it
        date = `${day}-${month}-${year}`

        // ensure all fields exist
        if (!x.reason || x.reason.trim() == '' || x.reason.length < 10) {
            res.send({status: 'error', alert: 'Please make sure the reason you provide for account deletion is at least 10 characters long.'})
            return
        }
        
        reason = x.reason.replace(/<[^>]*>/g, '')
        email = req.session.useremail

        // if the name change is the user themselves
        if (!x.email) {
            email = req.session.useremail

            // get user info
            user = await get_user_by_email(email)

            // ensure account exists
            if (user == undefined) {
                res.send({status: 'error', alert: 'We couldn\'t find your account. Please refresh the page and ensure that the URL path is typed in correctly. If the issue persists, please open a ticket to let me know.'});
                return
            }

            editingUser = undefined
        // if the name change is coming from somebody else
        } else {
            email = x.email

            // get user info
            user = await get_user_by_email(email)

            // ensure user exists
            if (user == undefined) {
                res.send({status: 'error', alert: 'We couldn\'t find the account of the user you want to delete. Please refresh the page and ensure that the URL path is typed in correctly. If the issue persists, please open a ticket to let me know.'});
                return
            }

            // get info of the user who is making the post request
            editingUserEmail = req.session.useremail
            editingUser = await get_user_by_email(editingUserEmail)

            // ensure that the user is a manager/dev
            if (!editingUser || !['manager', 'developer'].includes(editingUser.role)) {
                res.send({status: 'error', alert: 'It looks like you aren\'t a manager or a developer, so you aren\'t authorized to delete other users.'})
                return
            }

            // can't suspend a developer
            if (user.role == 'developer' && editingUser.role != 'developer') {
                res.send({status: 'error', alert: 'You can\'t delete the developer unless you are a developer.'})
                return
            }
        }

        // update the user
        await queryWithRetry('DELETE FROM users WHERE email = $1', [email])

        // get all changes
        const result = await queryWithRetry('SELECT "changeID" FROM changelog');

        // calculate the maximum changeID
        maxChangeID = 0
        for (i in result.rows) {
            rowID = result.rows[i].changeID
            if (rowID > maxChangeID) {
                maxChangeID = rowID
            }
        }

        // calculate the next change ID
        nextChangeID = maxChangeID + 1

        //update changelog
        if (!editingUser) {
            await queryWithRetry('INSERT INTO changelog ("changeID", "userEmail", "type", date, description, "excludedFromView") VALUES ($1, $2, $3, $4, $5, $6)', [nextChangeID, email, 'User Deleted', date, `${user.name} deleted their account for the reason: "${reason}"`, []]);
        } else {
            await queryWithRetry('INSERT INTO changelog ("changeID", "userEmail", "type", date, description, "excludedFromView") VALUES ($1, $2, $3, $4, $5, $6)', [nextChangeID, req.session.useremail, 'User Deleted', date, `${editingUser.name} deleted ${user.name}'s account for the reason: "${reason}"`, []]);
        }
        
        res.send({status: 'success'});
    } else {
        urlinit = '/profile' // redirect them to the current url after they logged in
        res.render('login.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedOut, urlinit: urlinit});
    }
} 

// change xp of a user
const changexppost = async (req, res)=>{
    console.log("CHANGE XP POST")

    x = req.body
    console.log(x)

    // only allow them to see tickets if they have been authenticated
    if (req.isAuthenticated()) {
        // handle suspended users
        suspensionDetails = await verifyUser(req)
        if (!isString(suspensionDetails)) {
            res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
            return
        }

        // get the current date
        now = new Date();

        // separate the parts of the date and ensure month and day are always two digits (e.g., 05 not 5)
        year = now.getFullYear()
        month = new Intl.DateTimeFormat('en', { month: '2-digit' }).format(now)
        day = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(now)

        // stringify it
        date = `${day}-${month}-${year}`

        // ensure the email is provided
        if (!x.email) {
            res.send({status: 'error', alert: 'We couldn\'t find the account. Please refresh the page and ensure that the URL path is typed in correctly. If the issue persists, please open a ticket to let me know.'});
            return
        }
            
        email = x.email

        // ensure the xp is valid
        if (!x.xp || parseInt(x.xp) < 0) {
            res.send({status: 'error', alert: 'The XP entered is invalid. Please ensure that it is a positive integer. If the issue persists, please open a ticket to let me know.'});
            return
        }

        xp = parseInt(x.xp)

        // ensure that a reason is provided
        if (!x.reason || x.reason.trim() == '' || x.reason.length < 5) {
            res.send({status: 'error', alert: 'It looks like the reason field is missing or too short. If this issue persists, please let me know at flyingbutter213@gmail.com.'})
            return
        } else {
            reason = x.reason.trim().replace(/<[^>]*>/g, '')
        }
        
        // get user info
        user = await get_user_by_email(email)

        // ensure user exists
        if (user == undefined) {
            res.send({status: 'error', alert: 'We couldn\'t find the account of the user you want to edit. Please refresh the page and ensure that the URL path is typed in correctly. If the issue persists, please open a ticket to let me know.'});
            return
        }

        // get info of the user who is making the post request
        editingUserEmail = req.session.useremail
        editingUser = await get_user_by_email(editingUserEmail)

        // ensure that the user is a manager/dev
        if (!editingUser || !['manager', 'developer'].includes(editingUser.role)) {
            res.send({status: 'error', alert: 'It looks like you aren\'t a manager or a developer, so you aren\'t authorized to edit the details of other users.'})
            return
        }

        // ensure the user isnt editing themselves
        if (email == req.session.useremail && editingUser.role != 'developer') {
            res.send({status: 'error', alert: 'You cannot change your own XP.'});
            return
        }

        // store the old xp
        oldXp = user.xp

        // update the user
        await queryWithRetry('UPDATE users SET xp = $1 WHERE email = $2', [xp, email])

        // get all changes
        const result = await queryWithRetry('SELECT "changeID" FROM changelog');

        // calculate the maximum changeID
        maxChangeID = 0
        for (i in result.rows) {
            rowID = result.rows[i].changeID
            if (rowID > maxChangeID) {
                maxChangeID = rowID
            }
        }

        // calculate the next change ID
        nextChangeID = maxChangeID + 1

        //update changelog
        await queryWithRetry('INSERT INTO changelog ("changeID", "userEmail", "type", date, description, "excludedFromView") VALUES ($1, $2, $3, $4, $5, $6)', [nextChangeID, editingUserEmail, 'User Edited', date, `${editingUser.name} changed ${user.name}\'s XP from ${oldXp} to ${xp} for reason: "${reason}"`, []]);
        
        res.send({status: 'success'});
    } else {
        urlinit = '/profile' // redirect them to the current url after they logged in
        res.render('login.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedOut, urlinit: urlinit});
    }
} 

// change role of a user
const changerolepost = async (req, res)=>{
    console.log("CHANGE ROLE POST")

    x = req.body
    console.log(x)

    // only allow them to see tickets if they have been authenticated
    if (req.isAuthenticated()) {
        // handle suspended users
        suspensionDetails = await verifyUser(req)
        if (!isString(suspensionDetails)) {
            res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
            return
        }

        // get the current date
        now = new Date();

        // separate the parts of the date and ensure month and day are always two digits (e.g., 05 not 5)
        year = now.getFullYear()
        month = new Intl.DateTimeFormat('en', { month: '2-digit' }).format(now)
        day = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(now)

        // stringify it
        date = `${day}-${month}-${year}`

        // ensure the email is provided
        if (!x.email) {
            res.send({status: 'error', alert: 'We couldn\'t find the account. Please refresh the page and ensure that the URL path is typed in correctly. If the issue persists, please open a ticket to let me know.'});
            return
        }
            
        email = x.email

        // ensure the role is valid
        if (!x.role || !['manager', 'developer', 'user'].includes(x.role)) {
            res.send({status: 'error', alert: 'The role entered is invalid. Please ensure that it is either manager, developer, or user. If the issue persists, please open a ticket to let me know.'});
            return
        }

        role = x.role

        // ensure that a reason is provided
        if (!x.reason || x.reason.trim() == '' || x.reason.length < 5) {
            res.send({status: 'error', alert: 'It looks like the reason field is missing or too short. If this issue persists, please let me know at flyingbutter213@gmail.com.'})
            return
        } else {
            reason = x.reason.trim().replace(/<[^>]*>/g, '')
        }
        
        // get user info
        user = await get_user_by_email(email)

        // ensure user exists
        if (user == undefined) {
            res.send({status: 'error', alert: 'We couldn\'t find the account of the user you want to edit. Please refresh the page and ensure that the URL path is typed in correctly. If the issue persists, please open a ticket to let me know.'});
            return
        }

        // get info of the user who is making the post request
        editingUserEmail = req.session.useremail
        editingUser = await get_user_by_email(editingUserEmail)

        // ensure that the user is a manager/dev
        if (!editingUser || !['manager', 'developer'].includes(editingUser.role)) {
            res.send({status: 'error', alert: 'It looks like you aren\'t a manager or a developer, so you aren\'t authorized to edit the details of other users.'})
            return
        }

        // ensure the user isnt editing themselves
        if (email == req.session.useremail && editingUser.role != 'developer') {
            res.send({status: 'error', alert: 'You cannot change your own role.'});
            return
        }

        // store the old role
        oldRole = user.role

        // update the user
        await queryWithRetry('UPDATE users SET role = $1 WHERE email = $2', [role, email])

        // get all changes
        const result = await queryWithRetry('SELECT "changeID" FROM changelog');

        // calculate the maximum changeID
        maxChangeID = 0
        for (i in result.rows) {
            rowID = result.rows[i].changeID
            if (rowID > maxChangeID) {
                maxChangeID = rowID
            }
        }

        // calculate the next change ID
        nextChangeID = maxChangeID + 1

        //update changelog
        if (!['manager', 'developer', 'user'].includes(oldRole)) {
            // they have been unsuspended
            await queryWithRetry('INSERT INTO changelog ("changeID", "userEmail", "type", date, description, "excludedFromView") VALUES ($1, $2, $3, $4, $5, $6)', [nextChangeID, editingUserEmail, 'User Unsuspended', date, `${editingUser.name} unsuspended ${user.name} (now ${role}) for reason: "${reason}"`, []]);
        } else {
            await queryWithRetry('INSERT INTO changelog ("changeID", "userEmail", "type", date, description, "excludedFromView") VALUES ($1, $2, $3, $4, $5, $6)', [nextChangeID, editingUserEmail, 'User Edited', date, `${editingUser.name} changed ${user.name}\'s role from ${oldRole} to ${role} for reason: "${reason}"`, []]);
        }
        
        res.send({status: 'success'});
    } else {
        urlinit = '/profile' // redirect them to the current url after they logged in
        res.render('login.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedOut, urlinit: urlinit});
    }
} 

// change number of grants mached
const changematchespost = async (req, res)=>{
    console.log("CHANGE MATCHES POST")

    x = req.body
    console.log(x)

    // only allow them to see tickets if they have been authenticated
    if (req.isAuthenticated()) {
        // handle suspended users
        suspensionDetails = await verifyUser(req)
        if (!isString(suspensionDetails)) {
            res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
            return
        }

        // get the current date
        now = new Date();

        // separate the parts of the date and ensure month and day are always two digits (e.g., 05 not 5)
        year = now.getFullYear()
        month = new Intl.DateTimeFormat('en', { month: '2-digit' }).format(now)
        day = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(now)

        // stringify it
        date = `${day}-${month}-${year}`

        // ensure the email is provided
        if (!x.email) {
            res.send({status: 'error', alert: 'We couldn\'t find the account. Please refresh the page and ensure that the URL path is typed in correctly. If the issue persists, please open a ticket to let me know.'});
            return
        }
            
        email = x.email

        // ensure the # of matches is valid
        if (!x.matches || parseInt(x.matches) < 0) {
            res.send({status: 'error', alert: 'The # of matches entered is invalid. Please ensure that it is a positive integer. If the issue persists, please open a ticket to let me know.'});
            return
        }

        matches = parseInt(x.matches)

        // ensure that a reason is provided
        if (!x.reason || x.reason.trim() == '' || x.reason.length < 5) {
            res.send({status: 'error', alert: 'It looks like the reason field is missing or too short. If this issue persists, please let me know at flyingbutter213@gmail.com.'})
            return
        } else {
            reason = x.reason.trim().replace(/<[^>]*>/g, '')
        }
        
        // get user info
        user = await get_user_by_email(email)

        // ensure user exists
        if (user == undefined) {
            res.send({status: 'error', alert: 'We couldn\'t find the account of the user you want to edit. Please refresh the page and ensure that the URL path is typed in correctly. If the issue persists, please open a ticket to let me know.'});
            return
        }

        // get info of the user who is making the post request
        editingUserEmail = req.session.useremail
        editingUser = await get_user_by_email(editingUserEmail)

        // ensure that the user is a manager/dev
        if (!editingUser || !['manager', 'developer'].includes(editingUser.role)) {
            res.send({status: 'error', alert: 'It looks like you aren\'t a manager or a developer, so you aren\'t authorized to edit the details of other users.'})
            return
        }

        // store the old matches
        oldMatches = user.grantsMatched

        // update the user
        await queryWithRetry('UPDATE users SET "grantsMatched" = $1 WHERE email = $2', [matches, email])

        // get all changes
        const result = await queryWithRetry('SELECT "changeID" FROM changelog');

        // calculate the maximum changeID
        maxChangeID = 0
        for (i in result.rows) {
            rowID = result.rows[i].changeID
            if (rowID > maxChangeID) {
                maxChangeID = rowID
            }
        }

        // calculate the next change ID
        nextChangeID = maxChangeID + 1

        //update changelog
        await queryWithRetry('INSERT INTO changelog ("changeID", "userEmail", "type", date, description, "excludedFromView") VALUES ($1, $2, $3, $4, $5, $6)', [nextChangeID, editingUserEmail, 'User Edited', date, `${editingUser.name} changed ${user.name}\'s # of grants matched from ${oldMatches} to ${matches} for reason: "${reason}"`, []]);
        
        res.send({status: 'success'});
    } else {
        urlinit = '/profile' // redirect them to the current url after they logged in
        res.render('login.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedOut, urlinit: urlinit});
    }
} 

// suspend a user
const suspenduserpost = async (req, res)=>{
    console.log("CHANGE MATCHES POST")

    x = req.body
    console.log(x)

    // only allow them to see tickets if they have been authenticated
    if (req.isAuthenticated()) {
        // handle suspended users
        suspensionDetails = await verifyUser(req)
        if (!isString(suspensionDetails)) {
            res.render('suspended.ejs', {root: path.join(__dirname, '../public'), head: headpartial, duration: suspensionDetails.duration, date: suspensionDetails.date, unsuspended: suspensionDetails.unsuspended, reason: suspensionDetails.reason, footer: partialfooterLoggedIn});
            return
        }

        // get the current date
        now = new Date();

        // separate the parts of the date and ensure month and day are always two digits (e.g., 05 not 5)
        year = now.getFullYear()
        month = new Intl.DateTimeFormat('en', { month: '2-digit' }).format(now)
        day = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(now)

        // stringify it
        date = `${day}-${month}-${year}`

        // ensure the email is provided
        if (!x.email) {
            res.send({status: 'error', alert: 'We couldn\'t find the account. Please refresh the page and ensure that the URL path is typed in correctly. If the issue persists, please open a ticket to let me know.'});
            return
        }
            
        email = x.email

        // ensure the suspension duration is valid
        if (!x.duration || parseInt(x.duration) < 0) {
            res.send({status: 'error', alert: 'The suspension duration is invalid. Please ensure that it is a positive integer. If the issue persists, please open a ticket to let me know.'});
            return
        }

        duration = parseInt(x.duration)

        // ensure the returning role is valid
        if (!x.role || !['manager', 'developer', 'user'].includes(x.role)) {
            res.send({status: 'error', alert: 'The returning role is invalid. Please ensure that it is either developer, manager, or user. If the issue persists, please open a ticket to let me know.'});
            return
        }

        role = x.role

        // ensure that a reason is provided
        if (!x.reason || x.reason.trim() == '' || x.reason.length < 5) {
            res.send({status: 'error', alert: 'It looks like the reason field is missing or too short. If this issue persists, please let me know at flyingbutter213@gmail.com.'})
            return
        } else {
            reason = x.reason.trim().replace(/<[^>]*>/g, '')
        }
        
        // get user info
        user = await get_user_by_email(email)

        // ensure user exists
        if (user == undefined) {
            res.send({status: 'error', alert: 'We couldn\'t find the account of the user you want to suspend. Please refresh the page and ensure that the URL path is typed in correctly. If the issue persists, please open a ticket to let me know.'});
            return
        }

        // get info of the user who is making the post request
        editingUserEmail = req.session.useremail
        editingUser = await get_user_by_email(editingUserEmail)

        // ensure that the user is a manager/dev
        if (!editingUser || !['manager', 'developer'].includes(editingUser.role)) {
            res.send({status: 'error', alert: 'It looks like you aren\'t a manager or a developer, so you aren\'t authorized to suspend other users.'})
            return
        }

        // can't suspend a developer
        if (user.role == 'developer' && editingUser.role != 'developer') {
            res.send({status: 'error', alert: 'You can\'t suspend the developer unless you are a developer.'})
            return
        }

        // store the suspension details
        suspensionDetails = `suspended:${duration}:${date}:${role}:${reason}`

        // update the user
        await queryWithRetry('UPDATE users SET "role" = $1 WHERE email = $2', [suspensionDetails, email])

        // get all changes
        const result = await queryWithRetry('SELECT "changeID" FROM changelog');

        // calculate the maximum changeID
        maxChangeID = 0
        for (i in result.rows) {
            rowID = result.rows[i].changeID
            if (rowID > maxChangeID) {
                maxChangeID = rowID
            }
        }

        // calculate the next change ID
        nextChangeID = maxChangeID + 1

        //update changelog
        await queryWithRetry('INSERT INTO changelog ("changeID", "userEmail", "type", date, description, "excludedFromView") VALUES ($1, $2, $3, $4, $5, $6)', [nextChangeID, editingUserEmail, 'User Suspended', date, `${editingUser.name} suspended ${user.name} for ${duration} days (returning as a ${role}) for reason: "${reason}"`, []]);
        
        res.send({status: 'success'});
    } else {
        urlinit = '/profile' // redirect them to the current url after they logged in
        res.render('login.ejs', {root: path.join(__dirname, '../public'), head: headpartial, footer: partialfooterLoggedOut, urlinit: urlinit});
    }
} 

// Export of all methods as object 
module.exports = { 
    dbgrants,
    dbresearchers,
    dbchangelog,
    dbclusters,
    dbgrantversion,
    dbresearcherversion,
    dbusers,
    dbcodes,

    nlpclustermatch,
    nlpmatch,
    nlprecalculate,

    indexget,
    tutorialget,
    loginget,
    signupget,
    addgrantget,
    grantpageget,
    editgrantget,
    matchget,
    recalculateget,
    managecodesget,
    researcherpageget,
    editresearcherget,
    addresearcherget,
    manageclustersget,
    ticketsget,
    ticketpageget,
    profileget,
    userpageget,

    indexpost,
    loginpost,
    signuppost,
    
    addgrantpost,
    editgrantpost,
    deletegrantpost,

    confirmmatchpost,

    confirmrecalculationpost,
    concluderecalculationpost,
    addclusterspost,

    addcodepost,
    removecodepost,

    deleteresearcherpost,
    editresearcherpost,
    addresearcherpost,

    manageclusterspost,

    addticketpost,
    addreplypost,
    editreplypost,
    editticketpost,
    resolvepost,

    changenamepost,
    changepasswordpost,
    deleteaccountpost,
    changexppost,
    changerolepost,
    changematchespost,
    suspenduserpost,
}
