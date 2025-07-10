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
app.get(['/', '/login', '/signup', '/addgrant', '/grant/:id', '/editgrant/:id', '/match/:id', '/recalculate'], routes)
app.post(['/', '/login', '/signup', '/addgrant', '/editgrant/:id', '/deletegrant/:id', '/confirmmatch/:id', '/confirmrecalculation', '/addclusters'], routes)

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

  try {
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
  } catch (err) {
    console.log(err)
    res.send({"error": "Something went wrong.", "relevant": []})
  }
})

// python nlp routes

// Match logic layer
app.post('/match', async (req, res) => {
    console.log(req.session.useremail)
    // TODO: Is there a better way to do this?
    if (req.session.useremail == null || req.session.useremail == undefined) {
        res.send({status: "error", alert: 'Please login first :)'});
        return
    }

    // STEP 1 - preliminary filtering (get researcherPool)
    try {
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
      if (x.lower == '') { x.lower = 0 }
      if (x.higher == '') { x.higher = 1 }

      // get the match keywords
      keywords = x.matchKeywords

      // get all the clusters
      allClustersDict = await queryAll('clusters')
      allClusters = []

      // get all cluster names
      for (i in allClustersDict) {
        cluster = allClustersDict[i]
        clusterName = cluster.name
        allClusters.push(clusterName)
      }

      // get all the researchers
      allResearchers = await queryAll('researchers')

      // list of all researchers
      researcherPool = []

      for (i in allResearchers) {
        researcher = allResearchers[i]

        // ensure that these fields match the researcher's data
        schoolCorrect = (x.school == "all" || researcher.school == x.school)
        genderCorrect = (x.gender == "all" || researcher.gender == x.gender)
        careerCorrect = (x.career == "all" || researcher.careerStage == x.career) 
        activityCorrect = (researcher.activity >= x.lower && researcher.activity <= x.higher)

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

        // add this property to the researchers
        researcher.clustersNames = clustersNames

        // only add the researchers to the list if they match all criteria
        if (schoolCorrect && genderCorrect && careerCorrect && activityCorrect && clusterCorrect) {
          researcherPool.push(researcher)
        }
      }

      // error out if no researchers found in preliminary filtering
      if (researcherPool.length == 0) {
        res.send({status: "error", alert: "No researchers were found given your filtration specifications. Try again with different parameters!"})
        return
      }

    } catch (err) {
      console.log(err)
      res.send({status: "error", alert: "Something wrong happened while processing your inputs and doing preliminary filtering. Please try again. If this problem persists, please open a ticket to let me know."})
      return
    }

    // STEP 2 - use the python NLP program
    try {
      // store the output (its very long so the JSON will get processed over multiple .stdout.on() events)
      output = '';

      error = false;

      // execute the python script
      const scriptExecution = spawn(pythonExecutable, 
        ["match.py", JSON.stringify(keywords), JSON.stringify(allClusters), JSON.stringify(researcherPool), x.cutOffMethod, x.cutOff, x.matchMethod]);

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

          console.log(data.toString())
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
    } catch (err) {
      console.log(err)
      res.send({status: "error", alert: "Something wrong happened while matching researchers. Please try again. If this problem persists, please open a ticket to let me know."})
      return
    }
})

// Recalculate logic layer
app.post('/recalculate', async (req, res) => {
    console.log(req.session.useremail)

    // TODO: Is there a better way to do this?
    if (req.session.useremail == null || req.session.useremail == undefined) {
        res.send({status: "error", alert: 'Please login first :)'});
        return
    }

    x = req.body
    console.log(x)

    // TRY CATCH DOESNT WORK. FIX THIS TODO
    try {
      // store the output (its very long so the JSON will get processed over multiple .stdout.on() events)
      output = '';

      error = false;

      // execute the python script
      const scriptExecution = spawn(pythonExecutable, 
        ["recalculate.py", JSON.stringify(x.fields), JSON.stringify(x.researchers), x.number, x.strictness, x.range, x.googleScholar]);

      // Handle normal output
      scriptExecution.stdout.on('data', async (data) => {
          output += data.toString(); // Accumulate output
      });

      // Handle error output
      scriptExecution.stderr.on('data', (data) => {
        console.log(data.toString())
        
        // ensure that no errors occured
        if (!error) {
          error = true;

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
    } catch (err) {
      console.log(err)
      res.send({status: "error", alert: "Something wrong happened while recalculating researchers. Please try again. If this problem persists, please open a ticket to let me know."})
      return
    }
})

// listen to port
app.listen(port, () => {
    console.log("Backend is listening on port 3000");
})

