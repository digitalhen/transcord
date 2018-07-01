const nodemailer = require('nodemailer');
const twilioClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const VoiceResponse = require('twilio').twiml.VoiceResponse;
const User = require('../models/user');
//const User = require('../models/user

var ivrController = {};


function reject() {
    const voiceResponse = new VoiceResponse();

    voiceResponse.say('Welcome to News Record. Your number was not recognized. Please visit news record dot com to register.');

    voiceResponse.hangup();

    return voiceResponse.toString();

}

ivrController.welcome = function(req, res) {

    const numberFrom = req.body.From;

    console.log("Incoming call from: " + numberFrom);

    User.findOne({
            phoneNumber: numberFrom
        })
        .then(function(user) {
            if (user == null) {
                res.send(reject());
            } else {
                const name = user.name;
                const voiceResponse = new VoiceResponse();

                const gather = voiceResponse.gather({
                    action: '/ivr/dialer',
                    finishOnKey: '#',
                    method: 'POST',
                });

                gather.say("Hello " + name + ", please enter the number you wish to dial, followed by the # key.");

                res.send(voiceResponse.toString());
            }
        })
        .catch(function(err) {
            console.log(err);
        });

};

ivrController.dialer = function(req, res) {
    const numberFrom = req.body.Caller;
    const numberCalled = req.body.Digits;

    const voiceResponse = new VoiceResponse();

    voiceResponse.say("Connecting you now.");

    const dial = voiceResponse.dial({
        record: 'record-from-ringing-dual',
        recordingStatusCallback: '/ivr/recording?numberFrom=' + encodeURIComponent(numberFrom) + '&numberCalled=' + encodeURIComponent(numberCalled),
        method: 'POST'
    });

    dial.number({
        url: '/ivr/privacynotice',
        method: 'POST'
    }, numberCalled);

    res.send(voiceResponse.toString());
};

ivrController.privacynotice = function(req, res) {
    const numberFrom = req.body.Caller;

    User.findOne({
            phoneNumber: numberFrom
        })
        .then(function(user) {
            if (user == null) {
                // TODO: we should never reach here?
            } else {
                const name = user.name;

                const voiceResponse = new VoiceResponse();

                const gather = voiceResponse.gather({
                    action: '/ivr/privacyconnect',
                    numDigits: '1',
                    method: 'POST',
                });

                gather.say("You have an incoming call from " + name + ". Please press any key to accept.");

                voiceResponse.say("Goodbye.");

                voiceResponse.hangup();

                res.send(voiceResponse.toString());
            }
        })
        .catch(function(err) {
            console.log(err);
        });
};

ivrController.privacyconnect = function(req, res) {
    const voiceResponse = new VoiceResponse();

    voiceResponse.say("Connecting you to the call.");

    res.send(voiceResponse.toString());
}

ivrController.recording = function(req, res) {
    const numberFrom = decodeURIComponent(req.query.numberFrom);
    const numberCalled = decodeURIComponent(req.query.numberCalled);
    const recordingUrl = req.body.RecordingUrl;
    const recordingSid = req.body.RecordingSid;

    // lookup the call here

    User.findOne({
            phoneNumber: numberFrom
        })
        .then(function(user) {
            if (user == null) {
                // TODO: we should never reach here?
            } else {
                const name = user.name;
                const email = user.email;

                // Look up the recording here....
                twilioClient.recordings(recordingSid)
                    .fetch()
                    .then(function(recording) {
                        const parentCallSid = recording.callSid;

                        // lets look up the parent here (from)...
                        twilioClient.calls(parentCallSid)
                            .fetch()
                            .then(function(call) {

                                // TODO: look up child call here (to)...
                                twilioClient.calls.each({
                                    parentCallSid: parentCallSid
                                }, function(childCall) {
                                    sendEmail(name, email, recording.duration, childCall.toFormatted, recordingUrl);

                                    // TODO: capture full sprectrum of calls
                                    user.recordings.push({
                                        numberCalled: childCall.toFormatted,
                                        recordingUrl: recordingUrl
                                    });

                                    User.update({
                                        _id: user._id
                                    }, {
                                        recordings: user.recordings
                                    }, function(err, numberAffected, rawResponse) {
                                        if (err) {
                                            console.log('There was an error');
                                        }
                                    });

                                    // TODO, fix for conference calls
                                });


                            })
                            .done();
                    })
                    .done();




                res.send('');
            }
        })
        .catch(function(err) {
            console.log(err);
        });
}

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

function sendEmail(name, emailTo, duration, numberCalled, recordingUrl) {
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        /*host: 'smtp.gmail.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: 'digitalhen@gmail.com', // generated ethereal user
            pass: 'iybfrzmemnvkyzhl' // generated ethereal password
        }*/
        host: 'localhost',
        port: 25,
        secure: false,
        ignoreTLS: true,
    });

    // setup email data with unicode symbols
    let mailOptions = {
        from: '"Transcord.app" <no-reply@transcord.app>', // sender address
        to: emailTo, // list of receivers
        subject: 'Recording of your call to ' + numberCalled, // Subject line
        text: 'Dear ' + name + ',\n\nHere is your ' + duration + ' second call recording: ' + recordingUrl, // plain text body
        html: 'Dear ' + name + ',<br/><br/><b>Thank you for using News Recorder!</b><br/>' +
            'Here is your ' + duration + ' second call recording: ' + recordingUrl
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

module.exports = ivrController;
