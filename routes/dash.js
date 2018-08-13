const Router = require('express').Router;
const User = require('../models/user');
const dash = require('../controllers/dashcontroller');

//const {reject, welcome, dialer, privacynotice, privacyconnect, recording} = require('../controllers/ivr');

const router = new Router();

// restrict index for logged in user only
router.get('/', dash.dashboard);

// show billing
router.get('/billing', dash.billing);

// show credit card payment screen
router.get('/payment', dash.payment);

// process credit card payment
router.post('/payment', dash.processPayment);

// show recordings list
router.get('/recordings', dash.recordings)

//  for getting a recording
router.get('/downloadRecording/:recordingSid', dash.downloadRecording);

// for deleting a recording
router.get('/deleteRecording/:recordingSid', dash.deleteRecording);

//  for getting a transcriptions
router.get('/transcript/:recordingSid', dash.transcript);

module.exports = router;
