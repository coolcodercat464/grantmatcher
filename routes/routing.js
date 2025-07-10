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
router.get('/', control.indexget)
router.post('/', control.indexpost)

router.get('/addgrant', control.addgrantget)
router.post('/addgrant', control.addgrantpost)

router.get('/grant/:id', control.grantpageget)

router.get('/editgrant/:id', control.editgrantget)
router.post('/editgrant/:id', control.editgrantpost)

router.post('/deletegrant/:id', control.deletegrantpost)

router.post('/confirmmatch/:id', control.confirmmatchpost)

router.post('/confirmrecalculation', control.confirmrecalculationpost)
router.post('/addclusters', control.addclusterspost)

router.get('/match/:id', control.matchget)

router.get('/login', control.loginget)
router.post('/login', control.loginpost)

router.get('/signup', control.signupget)
router.post('/signup', control.signuppost)

router.get('/recalculate', control.recalculateget)

module.exports = router;

