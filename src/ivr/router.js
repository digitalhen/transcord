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
  const numberFrom = req.query.numberFrom;
	const numberCalled = req.query.numberCalled;
	const recordingUrl = req.body.RecordingUrl;

  User.findOne({phoneNumber: numberFrom})
    .then(function(user) {
    	if(user==null) {
    		return res.send(reject());
    	} else {
    		const name = user.name;
        const emailAddress = user.emailAddress;

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
