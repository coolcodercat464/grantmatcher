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

router.get('/login', control.loginget)
router.post('/login', control.loginpost)

module.exports = router;

