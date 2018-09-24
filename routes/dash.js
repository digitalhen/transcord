let config = require('../env.json')[process.env.NODE_ENV || "development"];
const Router = require('express').Router;
const User = require('../models/user');
const dash = require('../controllers/dashcontroller');

//const {reject, welcome, dialer, privacynotice, privacyconnect, recording} = require('../controllers/ivr');

const router = new Router();

// restrict index for logged in user only
router.get('/', (req, res) => {
    res.redirect('/dashboard/calls');
  });

// show list of calls
router.get('/calls/:index*?', dash.calls);
  

// show billing
router.get('/billing', dash.billing);

// show credit card payment screen
router.get('/payment', dash.payment);

// process credit card payment
router.post('/payment', dash.processPayment);

// show payment screen for buying incoming number
router.get('/paymentIncoming', dash.paymentIncoming);

// show recordings list
router.get('/recordings', dash.recordings)

// get recordfings list / search
router.post('/ajaxSearchRecordings', dash.ajaxSearchRecordings);

//  for getting a recording
router.get('/downloadRecording/:recordingSid', dash.downloadRecording);

// for deleting a recording
router.get('/deleteRecording/:recordingSid', dash.deleteRecording);

// for deleting a recording by ajax
router.post('/ajaxDeleteRecording', dash.ajaxDeleteRecording);

//  for getting a transcriptions
router.get('/transcript/:recordingSid', dash.transcript);

// for sending a transcript by email
router.post('/ajaxSendTranscript', dash.ajaxSendTranscript);

//  for getting a transcription without being logged in
router.get('/transcript/:recordingSid/token/:token', dash.sharedTranscript);


module.exports = router;
