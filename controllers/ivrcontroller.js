const nodemailer = require('nodemailer');
const twilioClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const VoiceResponse = require('twilio').twiml.VoiceResponse;
const User = require('../models/user');
const storage = require('@google-cloud/storage');
const https   = require('https');
const request = require('request');
const fs      = require('fs');
const path    = require('path');
const ffmpeg = require('fluent-ffmpeg');


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
            combinedPhoneNumber: numberFrom
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
        recordingStatusCallback: '/ivr/recording',
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
            combinedPhoneNumber: numberFrom
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
    const recordingUrl = req.body.RecordingUrl;
    const recordingSid = req.body.RecordingSid;

    // Look up the recording here....
    twilioClient.recordings(recordingSid)
        .fetch()
        .then(function(recording) {
            const parentCallSid = recording.callSid;

            // lets look up the parent here (from)...
            twilioClient.calls(parentCallSid)
                .fetch()
                .then(function(parentCall) {
                    // TODO: Look up the user here:

                    User.findOne({
                            combinedPhoneNumber: parentCall.from
                        })
                        .then(function(user) {
                            if (user == null) {
                                // TODO: we should never reach here?
                            } else {
                                const name = user.name;
                                const email = user.email;

                                twilioClient.calls.each({
                                    parentCallSid: parentCallSid
                                }, function(childCall) {
                                    //sendEmail(name, email, recording.duration, childCall.toFormatted, recordingUrl);


                                    // TODO: capture full sprectrum of calls
                                    var recordingObject = {
                                        recordingSid: recordingSid,
                                        startTime: parentCall.startTime,
                                        endTime: parentCall.endTime,
                                        numberFrom: parentCall.from,
                                        numberFromFormatted: parentCall.fromFormatted,
                                        bridgeNumber: parentCall.to,
                                        numberCalled: childCall.to,
                                        numberCalledFormatted: childCall.toFormatted,
                                        duration: parseFloat(recording.duration),
                                        recordingUrl: recordingUrl,
                                        recordingUrlLeft: '',
                                        recordingUrlRight: ''
                                    };

                                    /*
                                    User.update({
                                        _id: user._id
                                    }, {
                                        recordings: user.recordings
                                    }, function(err, numberAffected, rawResponse) {
                                        if (err) {
                                            console.log('There was an error');
                                        }
                                    }); */

                                    // call download for this file
                                    processFiles(user, recordingObject);
                                    // TODO: can i make the email thing plug in to this?



                                    // TODO, fix for conference calls
                                });
                            }
                        });




                })
                .done();
        })
        .done();




    res.send('');
    /*      }
      })
      .catch(function(err) {
          console.log(err);
      });*/
}

/**
 * UTILITY SCRIPTS
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

function pushRecording(user, recordingObject) {
  console.log("Finishing processing files for user: " + user.username + ", pushing to database & sending email.");

  user.recordings.push(recordingObject);

  User.update({
      _id: user._id
  }, {
      recordings: user.recordings
  }, function(err, numberAffected, rawResponse) {
      if (err) {
          console.log('There was an error');
      }
  });

  sendEmail(user.name, user.email, recordingObject.duration, recordingObject.numberCalledFormatted, recordingObject.recordingUrl);
}

function processFiles(user, recordingObject) {
  var status = {
    main: false,
    left: false,
    right: false
  };

	console.log("Processing files for: " + recordingObject.recordingUrl);

    const PROJECT_ID = 'transcord-2018';

    var gcs = storage({
        projectId: PROJECT_ID,
        keyFilename: 'credentials/google.json'
    });

    let bucket = gcs.bucket('transcord.app');

    var filename = path.basename(recordingObject.recordingUrl);
    var dest = __basedir + '/downloads/' + filename;
    var stream = fs.createWriteStream(dest + '.wav');

    https.get(recordingObject.recordingUrl, function(res) {
        res.pipe(stream).on('close', function() {
              var main = ffmpeg(dest + '.wav')
                  .inputFormat('wav')
                  .audioChannels(2)
                  .audioBitrate('64k')
                  .on('end', function() {
                      bucket.upload(dest + '-main.wav', (err, file) => {
                          fs.unlink(dest + '.wav', (err, file) => {});
                          fs.unlink(dest + '-main.wav', (err, file) => {
                            bucket.file(filename + '-main.wav').getSignedUrl({
                                action: 'read',
                                expires: '03-09-2491'
                            }).then(signedUrls => {
                                recordingObject.recordingUrl = signedUrls[0];

                                status.main = true;

                                if(status.main && status.left && status.right)
                                  pushRecording(user, recordingObject);
                            });
                          });
                      });
                  })
                  .save(dest + '-main.wav');

              var right = ffmpeg(dest + '.wav')
                  .inputFormat('wav')
                  .audioChannels(2)
                  .audioBitrate('64k')
                  .outputOptions('-map_channel 0.0.1')
                  .on('end', function() {
                      bucket.upload(dest + '-right.wav', (err, file) => {
                          fs.unlink(dest + '-right.wav', (err, file) => {
                            bucket.file(filename + '-right.wav').getSignedUrl({
                                action: 'read',
                                expires: '03-09-2491'
                            }).then(signedUrls => {
                                recordingObject.recordingUrlRight = signedUrls[0];

                                status.right = true;

                                if(status.main && status.left && status.right)
                                  pushRecording(user, recordingObject);
                            });
                          });
                      });
                  })
                  .save(dest + '-right.wav');


              var left = ffmpeg(dest + '.wav')
                  .inputFormat('wav')
                  .audioChannels(2)
                  .audioBitrate('64k')
                  .outputOptions('-map_channel 0.0.0')
                  .on('end', function() {
                      bucket.upload(dest + '-left.wav', (err, file) => {
                          fs.unlink(dest + '-left.wav', (err, file) => {
                              bucket.file(filename + '-left.wav').getSignedUrl({
                                  action: 'read',
                                  expires: '03-09-2491'
                              }).then(signedUrls => {
                                  recordingObject.recordingUrlLeft = signedUrls[0];

                                  status.left = true;

                                  if(status.main && status.left && status.right)
                                    pushRecording(user, recordingObject);
                              });
                          });
                      });
                  })
                  .save(dest + '-left.wav');
        });
    }).on('error', function(e) {
        response.send("error connecting" + e.message);
    });
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
            '<a href="' + recordingUrl + '">Click here to listen to your ' + duration + ' second call.</a>'
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
