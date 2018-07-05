const twilio = require('twilio');
const express = require('express');
const router = express.Router();
const auth = require('../controllers/authcontroller');
const dash = require('../controllers/dashcontroller');
const ivrRouter = require('./ivr');
const dashRouter = require('./dash');
require('dotenv').config();

const shouldValidate = process.env.NODE_ENV !== 'test';

// restrict index for logged in user only
router.get('/', auth.home);

// route to register page
router.get('/register', auth.register);

// route for register action
router.post('/register', auth.doRegister);

// route for user profile
router.get('/settings', auth.settings);

// route for profile update
router.post('/settings', auth.doUpdate);

// route for validation
router.post('/validate', auth.validate);

// route to login page
router.get('/login', auth.login);

// route for login action
router.post('/login', auth.doLogin);

// route for logout action
router.get('/logout', auth.logout);



// GET: / - home page
/*router.get('/', (req, res) => {
  res.render('index');
});*/


// router for Dashboard
router.use('/dashboard', dashRouter);

// routers for ivr
router.use('/ivr', twilio.webhook({validate: shouldValidate}), ivrRouter);

module.exports = router;
