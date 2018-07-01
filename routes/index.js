const twilio = require('twilio');
const express = require('express');
const router = express.Router();
const auth = require('../controllers/authcontroller');
const dash = require('../controllers/dashcontroller');
const ivrRouter = require('./ivr');
require('dotenv').config();

const shouldValidate = process.env.NODE_ENV !== 'test';

// restrict index for logged in user only
router.get('/', auth.home);

// route to register page
router.get('/register', auth.register);

// route for register action
router.post('/register', auth.doRegister);

// route for user profile
router.get('/profile', auth.profile);

// route for profile update
router.post('/profile', auth.doUpdate);

// route for Dashboard
router.get('/dashboard', dash.list);

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



router.use('/ivr', twilio.webhook({validate: shouldValidate}), ivrRouter);

module.exports = router;
