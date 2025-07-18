// 3rd Party Modules 
const { Router } = require('express'); 
const passport = require('passport');
const path = require('path');

// Local Modules 
const control = require('../controllers/controller'); 

// Initialization 
const router = Router(); 
router.use(passport.initialize());
router.use(passport.session());

// Requests 

// database routes
router.get('/db/grants', control.dbgrants)
router.get('/db/researchers', control.dbresearchers)
router.get('/db/users', control.dbusers)
router.get('/db/clusters', control.dbclusters)
router.get('/db/changelog', control.dbchangelog)
router.get('/db/codes', control.dbcodes)
router.get('/db/grants/version/:id', control.dbgrantversion)
router.get('/db/researchers/version/:id', control.dbresearcherversion)

// nlp routes
router.post('/clustermatch', control.nlpclustermatch)
router.post('/match', control.nlpmatch)
router.post('/recalculate', control.nlprecalculate)

// other routes
router.get('/', control.indexget)
router.post('/', control.indexpost)

router.get('/managecodes', control.managecodesget)

router.post('/addcode', control.addcodepost)
router.post('/removecode', control.removecodepost)

router.get('/addgrant', control.addgrantget)
router.post('/addgrant', control.addgrantpost)

router.get('/addresearcher', control.addresearcherget)
router.post('/addresearcher', control.addresearcherpost)

router.get('/grant/:id', control.grantpageget)
router.get('/researcher/:id', control.researcherpageget)

router.get('/editgrant/:id', control.editgrantget)
router.post('/editgrant/:id', control.editgrantpost)

router.get('/editresearcher/:id', control.editresearcherget)
router.post('/editresearcher/:id', control.editresearcherpost)

router.post('/deletegrant/:id', control.deletegrantpost)
router.post('/deleteresearcher/:id', control.deleteresearcherpost)

router.post('/confirmmatch/:id', control.confirmmatchpost)

router.get('/recalculate', control.recalculateget)
router.post('/addclusters', control.addclusterspost)
router.post('/confirmrecalculation', control.confirmrecalculationpost)
router.post('/concluderecalculation', control.concluderecalculationpost)

router.get('/match/:id', control.matchget)

router.get('/login', control.loginget)
router.post('/login', control.loginpost)

router.get('/signup', control.signupget)
router.post('/signup', control.signuppost)

router.get('/manageclusters', control.manageclustersget)
router.post('/manageclusters', control.manageclusterspost)

router.get('/tickets', control.ticketsget)
router.post('/addticket', control.addticketpost)

router.get('/ticket/:id', control.ticketpageget)
router.post('/addreply', control.addreplypost)
router.post('/editreply', control.editreplypost)
router.post('/editticket', control.editticketpost)
router.post('/resolve', control.resolvepost)

router.get('/profile', control.profileget)
router.post('/changename', control.changenamepost)
router.post('/changepassword', control.changepasswordpost)
router.post('/deleteaccount', control.deleteaccountpost)

module.exports = router;

