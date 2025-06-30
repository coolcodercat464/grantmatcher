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

router.get('/login', control.loginget)
router.post('/login', control.loginpost)

router.get('/signup', control.signupget)
router.post('/signup', control.signuppost)

module.exports = router;

