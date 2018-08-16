let config = require('../env.json')[process.env.NODE_ENV || "development"];
process.env.TWILIO_ACCOUNT_SID = config.twilio_account_sid; // Pass account to environment as required by api
process.env.TWILIO_AUTH_TOKEN = config.twilio_auth_token; // Pass token to environment as required by api
const twilioClient = require('twilio')(config.twilio_account_sid, config.twilio_auth_token);
const VoiceResponse = require('twilio').twiml.VoiceResponse;
const User = require('../models/user');
const Rate = require('../models/rate');
const storage = require('@google-cloud/storage');
const speech = require('@google-cloud/speech');
const https   = require('https');
const request = require('request');
const fs      = require('fs');
const path    = require('path');
const ffmpeg = require('fluent-ffmpeg');
const jade = require('jade');
const moment = require('moment');
const emailHelper = require('../helpers/emailHelper');
const tim = require('tinytim').tim;
const strings = require('../strings.json');

const PROJECT_ID = config.google_project_id;
const GOOGLE_KEY = config.google_key;

var ivrController = {};


function reject() {
    const voiceResponse = new VoiceResponse();

    voiceResponse.say('Welcome to Transcord. This number is not currently active. Please visit transcord dot app to register.');

    voiceResponse.hangup();

    return voiceResponse.toString();

}

ivrController.incomingcall = function(req, res) {
    const numberFrom = req.body.From;
    const numberTo = req.body.To;

    console.log("Incoming call from: " + numberFrom + " and they are dialing: " + numberTo);

    User.findOne({
        incomingPhoneNumber: numberTo
    })
    .then(function(user) {
        if (user == null) {
            res.send(reject());
        } else {
            const name = user.name;
            const voiceResponse = new VoiceResponse();

            voiceResponse.say('This call will be recorded by Transcord.')

            // TODO: plug in to the database, and check the user is running
            const dial = voiceResponse.dial({
                record: 'record-from-ringing-dual',
                recordingStatusCallback: '/ivr/incomingrecording',
                method: 'POST'
            });

            dial.number(user.phoneNumber);

            res.send(voiceResponse.toString());
        }
    })
    .catch(function(err) {
        console.log(err);
    });
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
                const voiceResponse = new VoiceResponse();

                if(typeof user.balance === 'undefined' || user.balance<0) {
                    voiceResponse.say("Hello " + user.name + ", you have a balance due of $" + ((user.balance/100)*-1).toFixed(2) + ". Please visit transcord dot app to top up your account.");
                    voiceResponse.hangup();
                } else {
                    const gather = voiceResponse.gather({
                        action: '/ivr/dialer',
                        finishOnKey: '#',
                        method: 'POST',
                    });
    
                    gather.say("Hello " + user.name + ", your current balance is $" + (user.balance/100).toFixed(2) + ". Please enter the number you wish to dial, followed by the # key.");    
                }
            
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
        action: '/ivr/callFinished',
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

ivrController.callFinished = function(req, res) {
    /*
     * DialCallStatus -- completed
     * DialCallSid
     * DialCallDuration
     */

     /*
      * 1. Get current user & their rateCode
      * 2. Lookup the rateCode
      * 3. Create a new calls object, and calculate the cost based on the rateCode
      * 4. Push a new entry to the user's calls list 
      * 5. Take their current balance and minus the cost of the call
      * 6. Push user object back to database
      */

     const numberFrom = req.body.Caller;

     console.log(req.body);

     User.findOne({
             combinedPhoneNumber: numberFrom
         })
         .then(function(user) {
             if (user == null) {
                 // TODO: we should never reach here?
                 console.log('No user found during call finished handler');
             } else {
                var rateCode = typeof user.rateCode !== 'undefined' ? user.rateCode : 'DEFAULT';

                Rate.findOne({
                    "rateCode": rateCode
                })
                .then(function(rate) {
                    // calculate cost
                    var duration = req.body.RecordingDuration;
                    var roundedDuration = Math.ceil(duration/rate.unitLength)*60; // rounds up to the nearest unit specified by the block length in the rate (eg. units of 60 seconds);
                    var numberOfUnits = roundedDuration / rate.unitLength; // how many units of time did we use
                    var cost = numberOfUnits * rate.costPerUnit;

                    // build object
                    var call = {
                        "callSid": req.body.CallSid,
                        "dialCallSid": req.body.DialCallSid,
                        "direction": 0, // normal outgoing call
                        "duration": duration,
                        "rateCode": rateCode,
                        "cost": cost
                    };

                    user.calls.push(call);

                    // recalc balance
                    user.balance = user.balance - cost;

                    console.log('Call cost: ' + cost + ", new balance: " + user.balance);

                    // Push it to the user object
                    User.update({
                        _id: user._id
                    }, {
                        calls: user.calls,
                        balance: user.balance
                    }, function(err, numberAffected, rawResponse) {
                        if (err) {
                            console.log('There was an error');
                        }
                    });
                })
                .catch(function(err) {
                    console.log(err);
                });

                console.log("RateCode for this call: " + rateCode);
             }
         })
         .catch(function(err) {
             console.log(err);
         });
      
    res.send('');
}

ivrController.privacynotice = function(req, res) {
    const numberFrom = req.body.Caller;

    User.findOne({
            combinedPhoneNumber: numberFrom
        })
        .then(function(user) {
            if (user == null) {
                // TODO: we should never reach here?
                console.log('No user found during privacy notice');
            } else {
                const name = user.name;

                const voiceResponse = new VoiceResponse();

                // TODO: check user profile to see if they have privacy notice enabled
                if(user.privacyNotification !== 'undefined' && user.privacyNotification) {
                    const gather = voiceResponse.gather({
                        action: '/ivr/privacyconnect',
                        numDigits: '1',
                        method: 'POST', 
                    });
    
                    gather.say("You have an incoming call from " + name + ". Please press any key to accept.");
    
                    voiceResponse.say("No response received, goodbye.");
    
                    voiceResponse.hangup();
                }
                

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

// callback from outgoing calls to capture recording
ivrController.recording = function(req, res) {
    processRecordings(req.body.RecordingSid, req.body.RecordingUrl, 0);
    res.send('');
}

// callback from incoming calls to capture recording
ivrController.incomingrecording = function(req, res) {
    processRecordings(req.body.RecordingSid, req.body.RecordingUrl, 1);
    res.send('');
}

// handles recordings for both directions
function processRecordings(recordingSid, recordingUrl, direction) {
    // Look up the recording here.... 
    twilioClient.recordings(recordingSid)
        .fetch()
        .then(function(recording) {
            const parentCallSid = recording.callSid;

            // lets look up the parent call here (who the call is from)...
            twilioClient.calls(parentCallSid)
                .fetch()
                .then(function(parentCall) {

                    // find the child call that has this parent call
                    twilioClient.calls.each({
                        parentCallSid: parentCallSid
                    }, function(childCall) {
                        // build a recording object
                        var recordingObject = {
                            recordingSid: recordingSid,
                            direction: direction, // 0 means outgoing, 1 means incoming
                            startTime: parentCall.startTime,
                            endTime: parentCall.endTime,
                            numberFrom: parentCall.from,
                            numberFromFormatted: parentCall.fromFormatted,
                            bridgeNumber: parentCall.to,
                            numberCalled: childCall.to,
                            numberCalledFormatted: childCall.toFormatted,
                            duration: parseFloat(recording.duration),
                            recordingUrl: recordingUrl,
                        };

                        // find the user and download the files
                        if(direction==0) { // this is an outgoing call, so we're looking up their phone number
                            User.findOne({
                                combinedPhoneNumber: parentCall.from
                            })
                            .then(function(user) {
                                if (user == null) {
                                    // TODO: we should never reach here?
                                } else {
                                    processFiles(user, recordingObject);
                                }
                            });
                        } else if(direction==1) { // this is the incoming number, so we're looking for the number *called*
                            User.findOne({
                                incomingPhoneNumber: parentCall.to
                            })
                            .then(function(user) {
                                if (user == null) {
                                    // TODO: we should never reach here?
                                } else {
                                    processFiles(user, recordingObject);
                                }
                            });
                        }
                        

                        // TODO, fix for conference calls with multiple child calls
                    });
                    
                    




                })
                .done();
        })
        .done();
}

/**
 * UTILITY SCRIPTS
 */



function runTranscription(user, recordingObject) {
    // process audio through google speech to text, once for the caller audio, once for the receipient audio

  console.log("Running transcriptions for recording: " + recordingObject.recordingSid);

  var leftResults = [];
  var rightResults = [];

  var status = {
    //main: false,
    left: false,
    right: false
  }

  const config = {
    enableWordTimeOffsets: true,
    languageCode: 'en-US'
  };

  /*
  const main = {
    config: {languageCode: 'en-US'},
    audio: {
      uri: 'gs://transcord.app/' + recordingObject.recordingSid + '-main.wav'
    }
  }; */

  const left = {
    config: config,
    audio: {
      uri: 'gs://' + config.google_bucket + '/' + recordingObject.recordingSid + '-left.wav'
    }
  };

  const right = {
    config: config,
    audio: {
      uri: 'gs://' + config.google_bucket + '/' + recordingObject.recordingSid + '-right.wav'
    }
  };

  const client = new speech.SpeechClient({projectId: PROJECT_ID,
        keyFilename: GOOGLE_KEY});

  
    // make async call to google transcribe and then wait to hear back
  client
    .longRunningRecognize(left)
    .then(data => {
      const operation = data[0];
      // Get a Promise representation of the final result of the job
      return operation.promise();
    })
    .then(data => {
      console.log(data);
      const response = data[0];

      status.left = true;

      leftResults = response.results;

      recordingObject.transcriptionLeft = JSON.stringify(response.results);

      if(status.left && status.right) {
        var transcription = buildTranscription(leftResults, rightResults);
        recordingObject.transcription = JSON.stringify(transcription);
        saveToDatabase(user,recordingObject);
        console.log(transcription);
        generateEmail(user, recordingObject);      
      }
    })
    .catch(err => {
      console.error('ERROR:', err);
    });

    client
      .longRunningRecognize(right)
      .then(data => {
        const operation = data[0];
        // Get a Promise representation of the final result of the job
        return operation.promise();
      })
      .then(data => {
        const response = data[0];

        status.right = true;

        rightResults = response.results;

        recordingObject.transcriptionRight = JSON.stringify(response.results);

        if(status.left && status.right) {
          var transcription = buildTranscription(leftResults, rightResults);
          recordingObject.transcription = JSON.stringify(transcription);
          saveToDatabase(user,recordingObject);
          console.log(transcription);
          generateEmail(user, recordingObject);
        }

      })
      .catch(err => {
        console.error('ERROR:', err);
      });
}

function buildTranscription(leftResults, rightResults) {
    // this builds the objects to contains the transcriptions
  console.log("Building transcription...");

  var combinedTranscript = [];

  // go through the two seperate transcripts and combined them together
  leftResults.forEach(function (result) {
    var newLine = {};

    console.log(JSON.stringify(result.alternatives));

    // if there are any words, lets grab them
    if(result.alternatives.length > 0 && result.alternatives[0].words.length > 0) {
      newLine.side = 'left';

      // compute the float start time
      var startTimeSecond, startTimeNano = "0";

      if(typeof result.alternatives[0].words[0].startTime.seconds !== 'undefined')
        startTimeSecond = result.alternatives[0].words[0].startTime.seconds;

      if(typeof result.alternatives[0].words[0].startTime.nanos !== 'undefined')
        startTimeNano = result.alternatives[0].words[0].startTime.nanos;

      newLine.startTime = parseFloat(startTimeSecond + '.' + startTimeNano);


      newLine.transcript = result.alternatives[0].transcript;

      combinedTranscript.push(newLine);
    }

  });

  rightResults.forEach(function (result) {
    var newLine = {};

    // if there are any words, lets grab them
    if(result.alternatives.length > 0 && result.alternatives[0].words.length > 0) {
      newLine.side = 'right';

      // compute the float start time
      var startTimeSecond, startTimeNano = "0";

      if(typeof result.alternatives[0].words[0].startTime.seconds !== 'undefined')
        startTimeSecond = result.alternatives[0].words[0].startTime.seconds;

      if(typeof result.alternatives[0].words[0].startTime.nanos !== 'undefined')
        startTimeNano = result.alternatives[0].words[0].startTime.nanos;

      newLine.startTime = parseFloat(startTimeSecond + '.' + startTimeNano);

      newLine.transcript = result.alternatives[0].transcript;

      combinedTranscript.push(newLine);
    }
  });

  // sort the array so the two cominbed transcripts are in order
  combinedTranscript.sort(function(a,b) { return a.startTime - b.startTime; }); // sorts by startTime;

  return combinedTranscript;

}

function saveToDatabase(user, recordingObject) {
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
}

function processFiles(user, recordingObject) {
    // this downloads files from twilio and puts them in to google cloud

  var status = {
    main: false,
    left: false,
    right: false
  };

	console.log("Processing files for: " + recordingObject.recordingUrl);


    var gcs = storage({
        projectId: PROJECT_ID,
        keyFilename: GOOGLE_KEY
    });

    let bucket = gcs.bucket(config.google_bucket);

    var filename = path.basename(recordingObject.recordingUrl);
    var dest = __basedir + '/downloads/' + filename;
    var stream = fs.createWriteStream(dest + '.wav');

    https.get(recordingObject.recordingUrl, function(res) {
        res.pipe(stream).on('close', function() {
              // download the dual audio
              // TODO: swap the sides of the audio, left and right are on the wrong side

              var main = ffmpeg(dest + '.wav')
                  .inputFormat('wav')
                  .audioChannels(1)
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
                                  runTranscription(user, recordingObject);
                            });
                          });
                      });
                  })
                  .save(dest + '-main.wav');

              // download the audio for the person who received the call
              var right = ffmpeg(dest + '.wav')
                  .inputFormat('wav')
                  .audioChannels(1)
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
                                  runTranscription(user, recordingObject);
                            });
                          });
                      });
                  })
                  .save(dest + '-right.wav');

              // download the audio for the person that made the call
              var left = ffmpeg(dest + '.wav')
                  .inputFormat('wav')
                  .audioChannels(1)
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
                                    runTranscription(user, recordingObject);
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

function generateEmail(user, recording) {
    var transcription = JSON.parse(recording.transcription);

    // locals to feed through to template
    var locals = {'moment': moment, 'user': user, 'recording': recording, 'transcription': transcription};

    // loop through transcription object and build up the email
    var plaintextTranscript = '';
    var htmlTranscript = jade.renderFile('views/email/transcript.jade', locals);

    // build plain text
    transcription.forEach(function(line) {
      if(line.side=='left') {
        plaintextTranscript += 'You said:\n' + line.transcript + "\n\n";
      } else if(line.side=='right') {
        plaintextTranscript += 'They said:\n' + line.transcript + "\n\n";
      }
    });

    // generate the final bits
    var plaintextEmail = 'Dear ' + user.name + ',\n\nHere is your ' + recording.duration + ' second call transcript: https://transcord.app/dashboard/transcript/' + recording.recordingSid + '\n\n' +
    plaintextTranscript;
    var htmlEmail = htmlTranscript;
    var subject = 'Transcription of your call with ' + recording.numberCalledFormatted;

    // send the email
    emailHelper.sendEmail(user, subject, plaintextEmail, htmlEmail);

}

module.exports = ivrController;
