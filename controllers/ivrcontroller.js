let config = require('../env.json')[process.env.NODE_ENV || "development"];
process.env.TWILIO_ACCOUNT_SID = config.twilio_account_sid; // Pass account to environment as required by api
process.env.TWILIO_AUTH_TOKEN = config.twilio_auth_token; // Pass token to environment as required by api
const twilioClient = require('twilio')(config.twilio_account_sid, config.twilio_auth_token);
const VoiceResponse = require('twilio').twiml.VoiceResponse;
const User = require('../models/user');
const Rate = require('../models/rate');
const storage = require('@google-cloud/storage');
const speech = require('@google-cloud/speech');
const request = require('request');
const fs      = require('fs');
const path    = require('path');
const ffmpeg = require('fluent-ffmpeg');
const pug = require('pug');
const moment = require('moment');
const emailHelper = require('../helpers/emailHelper');
const transcriptionHelper = require('../helpers/transcriptionHelper');
const tim = require('tinytim').tim;
const strings = require('../strings.json');

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
        incomingCombinedPhoneNumber: numberTo
    })
    .then(function(user) {
        if (user == null) {
            return res.send(reject());
        } else {
            const name = user.name;
            const voiceResponse = new VoiceResponse();

            // check if user wants announcements OR the call will be blocked (and we MUST record)
            if((user.privacyNotification !== 'undefined' && user.privacyNotification) || (user.blockList !== 'undefined' && user.blockList.indexOf(numberFrom) > -1)) {
                voiceResponse.say('This call will be recorded by Transcord.');
            }

            // TODO: plug in to the database, and check the user is running
            const dial = voiceResponse.dial({
                action: '/ivr/incomingCallFinished',
                record: 'record-from-ringing-dual',
                recordingStatusCallback: '/ivr/incomingrecording',
                method: 'POST'
            });

            // if on block list, then forward it back to the same number, else, call the user
            if(user.blockList !== 'undefined' && user.blockList.indexOf(numberFrom) > -1) {
                console.log("Caller is blocked, forward the call back to themselves...");
                dial.number(numberFrom);
            } else {
                console.log("Forwarding the call to the user...");
                dial.number(user.phoneNumber);
            }

            return res.send(voiceResponse.toString());
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

ivrController.incomingCallFinished = function(req, res) {
    const userLookup = {
          incomingCombinedPhoneNumber: req.body.Called
      };

    billCall(userLookup, req, 1);

    const voiceResponse = new VoiceResponse();

    

    // let's check if the user has privacy on or off
    User.findOne(userLookup)
    .then(function(user) {
        if (user == null) {
            // Can't find a user so let's just hang up
        } else {
            if(user.privacyNotification !== 'undefined' && user.privacyNotification) {
                voiceResponse.say('Thank you for using Transcord. Please visit transcord dot app to sign up. Goodbye!');
            }
        }

        voiceResponse.hangup();
        return res.send(voiceResponse.toString());
    })
    .catch(function(err) {
        console.log(err);
    });

}

ivrController.callFinished = function(req, res) {
     const userLookup = {
             combinedPhoneNumber: req.body.Caller
         };

     billCall(userLookup, req, 0);

     const voiceResponse = new VoiceResponse();

    voiceResponse.say('Thank you for using Transcord. Goodbye!');

    voiceResponse.hangup(); 

    res.send(voiceResponse.toString());
}

function billCall(userLookupObject, req, direction) {

    console.log("Looking up user");
    console.log(userLookupObject);


     User.findOne(userLookupObject)
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
                        "direction": direction, // normal outgoing call
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
                    // Pause to let the person put the phone to their ear
                    //voiceResponse.pause({ length: 1 });

                    /*const gather = voiceResponse.gather({
                        action: '/ivr/privacyconnect',
                        numDigits: '1',
                        method: 'POST',
                    }); */

                    voiceResponse.say("You have an incoming call from " + name + ". This call will be recorded by Transcord. Please visit transcord dot app to learn more.");

                    //voiceResponse.say("No response received, goodbye.");

                    //voiceResponse.hangup();
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

    // TODO: Need to bill this?

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

                        // now build an object to search for the user and process the files
                        var userLookupObject = {};

                        if(direction==0) {
                            userLookupObject = {
                                combinedPhoneNumber: parentCall.from
                            };
                        } else if(direction==1) {
                            userLookupObject = {
                                incomingCombinedPhoneNumber: parentCall.to
                            };
                        }

                        // find the right kind of user and process the files.
                        User.findOne(userLookupObject)
                            .then(function(user) {
                                if (user == null) {
                                    throw new Error("User not found");
                                }

                                // mark progress
                                recordingObject.processingStatus = 0; // initial status
                                    
                                // save progress to the database
                                saveToDatabase(user, recordingObject);

                                // process the files
                                processFiles(user, recordingObject);
                            });


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

  const encoding = 'LINEAR16';//'Eencoding of the audio file, e.g. LINEAR16';
  const sampleRateHertz = 8000;
  const languageCode = 'en-US';
  const enableWordTimeOffsets = true;

  const transcriptionconfig = {
    encoding: encoding,
    sampleRateHertz: sampleRateHertz,
    languageCode: languageCode,
    enableWordTimeOffsets: enableWordTimeOffsets,
  };

  /*
  const main = {
    config: {languageCode: 'en-US'},
    audio: {
      uri: 'gs://transcord.app/' + recordingObject.recordingSid + '-main.wav'
    }
  }; */

  const left = {
    config: transcriptionconfig,
    audio: {
      uri: 'gs://' + config.google_bucket + '/' + recordingObject.recordingSid + '-left.wav'
    }
  };

  const right = {
    config: transcriptionconfig,
    audio: {
      uri: 'gs://' + config.google_bucket + '/' + recordingObject.recordingSid + '-right.wav'
    }
  };

  const client = new speech.SpeechClient({projectId: config.google_project_id,
        keyFilename: config.google_key});

    // make async call to google transcribe and then wait to hear back
  client
    .longRunningRecognize(left)
    .then(data => {
      const operation = data[0];
      // Get a Promise representation of the final result of the job
      return operation.promise();
    })
    .then(data => {
      //console.log(data);
      const response = data[0];

      status.left = true;

      leftResults = response.results;

      recordingObject.transcriptionLeft = JSON.stringify(response.results);

      if(status.left && status.right) {
        var transcription = transcriptionHelper.buildTranscription(leftResults, rightResults);
        recordingObject.transcription = JSON.stringify(transcription);
        recordingObject.processingStatus = 2; // finished (with transcription)
        saveToDatabase(user,recordingObject);
        //console.log(transcription);
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
            var transcription = transcriptionHelper.buildTranscription(leftResults, rightResults);
            recordingObject.processingStatus = 2; // finished (with transcription)
          recordingObject.transcription = JSON.stringify(transcription);
          saveToDatabase(user,recordingObject);
          //console.log(transcription);
          generateEmail(user, recordingObject);
        }

      })
      .catch(err => {
        console.error('ERROR:', err);
      });
}



function saveToDatabase(user, recordingObject) {
  console.log("Updating recording object for user: " + user.username + ", recordingSid: " + recordingObject.recordingSid + ", status: " + recordingObject.processingStatus);

  // TODO: this needs to find the recordingObject in the user and update it if needed and pass it back?
  user.recordings.push(recordingObject);

  // look up the user and recording, if we don't find it, then push it
  User.update({
      "_id": user._id,
      "recording.recordingSid": recordingObject.recordingSid
  }, {
      "$set": {
          "recordings.$": recordingObject
      }
  }, function(err, numberAffected, rawResponse) {
      if (err) {
         throw new Error('There was an error looking for an existing recording object');
      }

      console.log("numAffected: ");
      console.log(numberAffected);
      console.log("rawResponse: " + rawResponse);

      if(numberAffected.nModified==0) {
          // the recording object doesn't exist, so we need to insert it
          console.log("Going to try and create a new recording object");

          //console.log(user);

          User.update({
            _id: user._id
          }), {
              "$push": { "recordings": recordingObject }
          }, function(err, numberAffected, rawResponse) {
            if (err) {
                throw new Error('There was an error inserting a new recording object');
            }

            console.log('Successfully inserted new recording object');
          }
      } else {
        console.log('Successfully updated recording object');
      }
  });

  /*
  {
        passwordResets: {
            $all: [{
                "$elemMatch": {
                    "token": token,
                }
            }]
        }
    } */
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
        projectId: config.google_project_id,
        keyFilename: config.google_key
    });

    let bucket = gcs.bucket(config.google_bucket);

    var filename = path.basename(recordingObject.recordingUrl);
    var dest = __basedir + '/downloads/' + filename;
    var stream = fs.createWriteStream(dest + '.wav');

    var r = request(recordingObject.recordingUrl);
    r.pause();
    r.on('response', function(res) {
            if(res.statusCode=="200" && res.headers['content-type'] == 'audio/x-wav') {
                r.pipe(stream).on('close', function() {
                    // download the dual audio
                    // TODO: swap the sides of the audio, left and right are on the wrong side

                    var main = ffmpeg(dest + '.wav')
                        .inputFormat('wav')
                        .audioBitrate('16k')
                        .audioCodec('pcm_s16le')
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

                                      if(status.main && status.left && status.right) {
                                        // mark progress
                                        recordingObject.processingStatus = 1; // audio complete
                                        
                                        // save progress to the database
                                        saveToDatabase(user, recordingObject);

                                        // now try and run the transcription
                                        runTranscription(user, recordingObject);
                                    }
                                  });
                                });
                            });
                        })
                        .save(dest + '-main.wav');

                    // download the audio for the person who received the call
                    var right = ffmpeg(dest + '.wav')
                        .inputFormat('wav')
                        .audioChannels(1)
                        .audioBitrate('16k')
                        .audioCodec('pcm_s16le')
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

                                      if(status.main && status.left && status.right) {
                                        // mark progress
                                        recordingObject.processingStatus = 1; // audio complete
                                        
                                        // save progress to the database
                                        saveToDatabase(user, recordingObject);

                                        // now try and run the transcription
                                        runTranscription(user, recordingObject);
                                    
                                    }
                                  });
                                });
                            });
                        })
                        .save(dest + '-right.wav');

                    // download the audio for the person that made the call
                    var left = ffmpeg(dest + '.wav')
                        .inputFormat('wav')
                        .audioChannels(1)
                        .audioBitrate('16k')
                        .audioCodec('pcm_s16le')
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

                                        if(status.main && status.left && status.right) {
                                            // mark progress
                                            recordingObject.processingStatus = 1; // audio complete
                                            
                                            // save progress to the database
                                            saveToDatabase(user, recordingObject);

                                            // now try and run the transcription
                                            runTranscription(user, recordingObject);
                                        }
                                        

                                
                                            
                                    });
                                });
                            });
                        })
                        .save(dest + '-left.wav');
              });

                r.resume();

                console.log("File successfully written to: " + dest);
            } else {
                console.log("There was an error, received status code: " + res.statusCode + " and content-type: " + res.headers['content-type'] + " for: " + recordingObject.recordingUrl);
            }
        });


}

function generateEmail(user, recording) {
    var transcription = JSON.parse(recording.transcription);

    // locals to feed through to template
    var locals = {'moment': moment, 'user': user, 'recording': recording, 'transcription': transcription, 'config': config, 'strings': strings};

    // loop through transcription object and build up the email
    var plaintextTranscript = '';
    var htmlTranscript = pug.renderFile('views/email/transcript.pug', locals);

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

    var subject = 'Transcription of your call ';
    if(recording.direction==0) {
      subject = subject + 'to ' + recording.numberCalledFormatted;
    } else if (recording.direction==1) {
      subject = subject + 'from ' + recording.numberFromFormatted;
    }

    // send the email
    emailHelper.sendEmail(user, subject, plaintextEmail, htmlEmail);

}

module.exports = ivrController;
