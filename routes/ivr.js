const Router = require('express').Router;
const User = require('../models/user');
const ivr = require('../controllers/ivrcontroller');

//const {reject, welcome, dialer, privacynotice, privacyconnect, recording} = require('../controllers/ivr');

const router = new Router();

router.get('*', (req, res) => {
  res.redirect('/');
});

// POST: /ivr/welcome
router.post('/welcome', ivr.welcome);

// POST: /ivr/dialer
router.post('/dialer', ivr.dialer);

// POST: /ivr/privacynotice
router.post('/privacynotice', ivr.privacynotice);

// POST: /ivr/privacyconnect
router.post('/privacyconnect', ivr.privacyconnect);

// POST: /ivr/recording
router.post('/recording', ivr.recording);

module.exports = router;