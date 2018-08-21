let config = require('../env.json')[process.env.NODE_ENV || "development"];
const Router = require('express').Router;
const User = require('../models/user');
const ivr = require('../controllers/ivrcontroller');

//const {reject, welcome, dialer, privacynotice, privacyconnect, recording} = require('../controllers/ivr');

const router = new Router();

router.get('*', (req, res) => {
  res.redirect('https://transcord.app/');
});

// POST: /ivr/welcome
router.post('/welcome', ivr.welcome);

// POST: /ivr/dialer
router.post('/dialer', ivr.dialer);

// POST: /ivr/callFinished
router.post('/callFinished', ivr.callFinished);

// POST: /ivr/privacynotice
router.post('/privacynotice', ivr.privacynotice);

// POST: /ivr/privacyconnect
router.post('/privacyconnect', ivr.privacyconnect);

// POST: /ivr/recording
router.post('/recording', ivr.recording);

// POST: /ivr/incomingcall
router.post('/incomingcall', ivr.incomingcall);

// POST: /ivr/incomingrecording
router.post('/incomingrecording', ivr.incomingrecording);

module.exports = router;
