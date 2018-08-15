let config = require('../env.json')[process.env.NODE_ENV || "development"];
const twilio = require('twilio');
const express = require('express');
const router = express.Router();
const auth = require('../controllers/authcontroller');
const dash = require('../controllers/dashcontroller');
const ivrRouter = require('./ivr');
const dashRouter = require('./dash');

const shouldValidate = process.env.NODE_ENV !== 'test';


// restrict index for logged in user only
router.get('/', auth.home);

// privacy policy
router.get('/privacy', auth.privacy);

// route to register page
router.get('/register/:rateCode*?', auth.register);

// route for register action
router.post('/register', auth.doRegister);

// route for user profile -- optionally allows action to be specified
router.get('/settings/:action*?', auth.settings);

// route to reset password page
router.get('/reset', auth.reset);

// route to reset password page and check the token (this comes from the user's email)
router.get('/reset/:token', auth.doReset);

// route to reset password page and send the email
router.post('/reset', auth.sendReset);

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
