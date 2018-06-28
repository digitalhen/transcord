const Router = require('express').Router;
const User = require('../models/user');
const {reject, welcome, dialer, privacynotice, privacyconnect, recording} = require('./handler');

const router = new Router();

router.get('*', (req, res) => {
  res.redirect('/');
});

// POST: /ivr/welcome
router.post('/welcome', (req, res) => {

  const numberFrom = req.body.From;

  console.log("Incoming call from: " + numberFrom);


  //return res.send(welcome(callFrom));

  User.findOne({phoneNumber: numberFrom})
    .then(function(user) {
    	if(user==null) {
    		return res.send(reject());
    	} else {
    		const name = user.name;

    		return res.send(welcome(name, numberFrom));
    	}
    })
    .catch(function(err) {
        console.log(err);
    });

});

// POST: /ivr/dialer
router.post('/dialer', (req, res) => {
  const numberFrom = req.body.Called;
	const numberCalled = req.body.Digits;
	return res.send(dialer(numberFrom, numberCalled));
});

// POST: /ivr/privacynotice
router.post('/privacynotice', (req, res) => {
        return res.send(privacynotice());
});

// POST: /ivr/dialer
router.post('/privacyconnect', (req, res) => {
        return res.send(privacyconnect());
});

// POST: /ivr/recording
router.post('/recording', (req, res) => {
  const numberFrom = decodeURIComponent(req.query.numberFrom);
	const numberCalled = decodeURIComponent(req.query.numberCalled);
	const recordingUrl = req.body.RecordingUrl;

  console.log("In recording, numberFrom: " + numberFrom);
  console.log("In recording, numberCalled: " + numberCalled);
  console.log("In recording, recordingUrl: " + recordingUrl);

  User.findOne({phoneNumber: numberFrom})
    .then(function(user) {
    	if(user==null) {
        console.log("In recording db, user was null");
    		// TODO: we should never reach here?
    	} else {
        const name = user.name;
        const emailAddress = user.emailAddress;

        console.log("In recording db, name: " + name);
        console.log("In recording db, emailAddress: " + emailAddress);

    		return res.send(recording(name, emailAddress, numberFrom, numberCalled, recordingUrl));
    	}
    })
    .catch(function(err) {
        console.log(err);
    });
});

/*
// POST: /ivr/menu
router.post('/menu', (req, res) => {
  const digit = req.body.Digits;
  return res.send(menu(digit));
}); */

/*
// POST: /ivr/planets
router.post('/planets', (req, res) => {
  const digit = req.body.Digits;
  res.send(planets(digit));
}); */

module.exports = router;
