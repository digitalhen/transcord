const nodemailer = require('nodemailer');
const VoiceResponse = require('twilio').twiml.VoiceResponse;
//const User = require('../models/user');

exports.reject = function reject() {
	const voiceResponse = new VoiceResponse();

	voiceResponse.say('Welcome to News Record. Your number was not recognized. Please visit news record dot com to register.');

	voiceResponse.hangup();

        return voiceResponse.toString();

}




exports.welcome = function welcome(name, numberFrom) {
  const voiceResponse = new VoiceResponse();



    const gather = voiceResponse.gather({
                action: '/ivr/dialer',
                finishOnKey: '#',
                method: 'POST',
        });

        //gather.play({loop: 3}, bodyUrl);
        gather.say("Hello " + name + ", please enter the number you wish to dial, followed by the # key.");

        return voiceResponse.toString();



  // TODO: if this is not a valid user: return rejectCall();
};

exports.dialer = function dialer(numberFrom, numberCalled) {
	// TODO: verify number is 10 digits long?

	const voiceResponse = new VoiceResponse();

	voiceResponse.say("Connecting you now.");

	const dial = voiceResponse.dial({
		record: 'record-from-ringing-dual',
		recordingStatusCallback: '/ivr/recording?numberFrom=' + numberFrom + ' &numberCalled=' + numberCalled,
		method: 'POST'
	});

	dial.number({
		url: '/ivr/privacynotice',
		method: 'POST'
	}, number);

	return voiceResponse.toString();
};

exports.privacynotice = function privacynotice() {
	// TODO: check if a privacy notice is set, if not just skip straight to connecting you to the call

	const voiceResponse = new VoiceResponse();

	const gather = voiceResponse.gather({
		action: '/ivr/privacyconnect',
		numDigits: '1',
		method: 'POST',
	});

	gather.say("This is a call from the Wall Street Journal, and will be recorded. Please press any key to accept.");

	voiceResponse.say("Goodbye.");

	voiceResponse.hangup();

	return voiceResponse.toString();
};

exports.privacyconnect = function privacyconnect() {
	const voiceResponse = new VoiceResponse();

	voiceResponse.say("Connecting you to the call.");

	return voiceResponse.toString();
};

exports.recording = function recording(name, email address, numberFrom, numberCalled, recordingUrl) {
	// TODO: save to the database

	// TODO: send the email
	sendEmail(name, emailAddress, numberCalled, recordingUrl);

	return "";
};

/*

exports.menu = function menu(digit) {
  const optionActions = {
    '1': giveExtractionPointInstructions,
    '2': listPlanets,
  };

  return (optionActions[digit])
    ? optionActions[digit]()
    : redirectWelcome();
}; */

/*
exports.planets = function planets(digit) {
  const optionActions = {
    '2': '+12024173378',
    '3': '+12027336386',
    '4': '+12027336637',
  };

  if (optionActions[digit]) {
    const twiml = new VoiceResponse();
    twiml.dial(optionActions[digit]);
    return twiml.toString();
  }

  return redirectWelcome();
}; **/



/**
 * Returns Twiml
 * @return {String}
 */
/*
function giveExtractionPointInstructions() {
  const twiml = new VoiceResponse();

  twiml.say(
    'To get to your extraction point, get on your bike and go down ' +
    'the street. Then Left down an alley. Avoid the police cars. Turn left ' +
    'into an unfinished housing development. Fly over the roadblock. Go ' +
    'passed the moon. Soon after you will see your mother ship.',
    {voice: 'alice', language: 'en-GB'}
  );

  twiml.say(
    'Thank you for calling the ET Phone Home Service - the ' +
    'adventurous alien\'s first choice in intergalactic travel'
  );

  twiml.hangup();

  return twiml.toString();
} */

/**
 * Returns a TwiML to interact with the client
 * @return {String}
 */
/*
function listPlanets() {
  const twiml = new VoiceResponse();

  const gather = twiml.gather({
    action: '/ivr/planets',
    numDigits: '1',
    method: 'POST',
  });

  gather.say(
    'To call the planet Broh doe As O G, press 2. To call the planet DuhGo ' +
    'bah, press 3. To call an oober asteroid to your location, press 4. To ' +
    'go back to the main menu, press the star key ',
    {voice: 'alice', language: 'en-GB', loop: 3}
  );

  return twiml.toString();
} */

/**
 * Returns an xml with the redirect
 * @return {String}
 */
function redirectWelcome() {
  const twiml = new VoiceResponse();

  twiml.say('Returning to the main menu', {
    voice: 'alice',
    language: 'en-GB',
  });

  twiml.redirect('/welcome');

  return twiml.toString();
}

function sendEmail(name, emailTo, numberCalled, recordingUrl) {
	// create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: 'digitalhen@gmail.com', // generated ethereal user
            pass: 'iybfrzmemnvkyzhl' // generated ethereal password
        }
    });

    // setup email data with unicode symbols
    let mailOptions = {
        from: '"News Recorder" <digitalhen@gmail.com>', // sender address
        to: '"' + name + '" <' + emailTo + '>', // list of receivers
        subject: 'Recording of your call to ' + numberCalled, // Subject line
        text: 'Dear ' + name + ',\n\nHere is your call recording: ' + recordingUrl, // plain text body
        html: 'Dear ' + name + ',<br/><br/><b>Thank you for using News Recorder!</b><br/>' +
		'The call recording can be found here: ' + recordingUrl
// html body
    };

    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message sent: %s', info.messageId);

        // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
    });
}
