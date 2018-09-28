let config = require('../env.json')[process.env.NODE_ENV || "development"];
process.env.TWILIO_ACCOUNT_SID = config.twilio_account_sid; // Pass account to environment as required by api
process.env.TWILIO_AUTH_TOKEN = config.twilio_auth_token; // Pass token to environment as required by api
const twilioClient = require('twilio')(config.twilio_account_sid, config.twilio_auth_token);
var mongoose = require("mongoose");
var passport = require("passport");
var User = require("../models/user");
var squareConnect = require('square-connect');
var transcriptionHelper = require('../helpers/transcriptionHelper');
const https   = require('https');
const moment = require('moment');
const pug = require('pug');
const emailHelper = require("../helpers/emailHelper");
const numberHelper = require("../helpers/numberHelper");
const tim = require('tinytim').tim;
const strings = require('../strings.json');
const uuidv1 = require('uuid/v1');
const fuse = require('fuse.js');


var dashController = {};

// Go to registration page
dashController.calls = function(req, res) {
  if (!req.user) {
      req.session.redirectTo = req.originalUrl;
      return res.redirect('/login');
  }

  // check for a negative balance and force payment
  if(req.user.balance<0) {
      return res.redirect('/dashboard/payment');
  }

  // see if we have a starting index, try to parse, and in both cases set it to 0
  var startingIndex = typeof req.params.index !== 'undefined' ? req.params.index : 0
  startingIndex = numberHelper.tryParseInt(startingIndex, 0);

  // TODO: combine the transcripts here?


  res.render('dashboard', {
      user: req.user,
      startingIndex: startingIndex,
      tim: tim,
      strings: strings,
  });
};

dashController.billing = function(req, res) {
  if (!req.user) {
      req.session.redirectTo = req.originalUrl;
      return res.redirect('/login');
  }

  // check for a negative balance and force payment
  if(req.user.balance<0) {
    return res.redirect('/dashboard/payment');
  }

  res.render('billing', {
      user: req.user,
      tim: tim,
      strings: strings,
  });
}

dashController.payment = function(req, res) {
    if (!req.user) {
        req.session.redirectTo = req.originalUrl;
        return res.redirect('/login');
    }
  
    res.render('payment', {
        user: req.user,
        square: {
            application_id: config.square_application_id,
            location: config.square_location
        },
        tim: tim,
        strings: strings,
    });
}

dashController.paymentIncoming = function(req, res) {
    if (!req.user) {
        req.session.redirectTo = req.originalUrl;
        return res.redirect('/login');
    }
  
    res.render('paymentIncoming', {
        user: req.user,
        square: {
            application_id: config.square_application_id,
            location: config.square_location
        },
        tim: tim,
        strings: strings,
    });
}

dashController.processPayment = function(req, res) {
    if (!req.user) {
        req.session.redirectTo = req.originalUrl;
        return res.redirect('/login');
    }

    var user = req.user;

    // set up square client
    // TODO: should i move this in to the greater application so we only call it once?
    var squareClient = squareConnect.ApiClient.instance;
    var oauth2 = squareClient.authentications['oauth2'];
    oauth2.accessToken = config.square_access_token;

    // get the variables
    var amount = parseInt(req.body.amount); // the amount to load, in dollars
    var nonce = req.body.nonce; // the nonce from the sq payment system

    var token = require('crypto').randomBytes(64).toString('hex');

    // charge the customer's card
    var transactions_api = new squareConnect.TransactionsApi();
	var request_body = {
		card_nonce: nonce,
		amount_money: {
			amount: amount,
			currency: 'USD'
		},
		idempotency_key: token
    };
        
    transactions_api.charge(config.square_location, request_body).then(function(data) {        
        // TO DO: Payment WAS successful. Update database
        
        console.log("Saving payment to database...")
        var paymentObject = {
            id: data.transaction.id,
            transactionId: data.transaction.transaction_id,
            date: data.transaction.created_at,
            amount: data.transaction.tenders[0].amount_money.amount,
            currency: data.transaction.tenders[0].amount_money.currency,
            cardBrand: data.transaction.tenders[0].card_details.card.card_brand,
            cardLast4: data.transaction.tenders[0].card_details.card.last_4,
        };

        //user.payments.push(paymentObject);

        if(req.body.type==="incoming") {
            // FOR INCOMING NUMBERS, BUY THE NUMBER
            twilioClient.availablePhoneNumbers('US').local.list({
                areaCode:'916'
            }).then(data => {
                // handle the case where there are no numbers found
                if (data.length < 1) {
                    throw { message: 'Oh noes! There are no 916 phone numbers!' };
                }
            
                // Return promise for the call to buy a number...
                return twilioClient.incomingPhoneNumbers.create({
                    friendlyName: "Incoming number for user: " + user.username,
                    phoneNumber:data[0].phoneNumber,
                    voiceUrl: 'https://' + config.hostname + '/ivr/incomingcall'
                });
            }).then(purchasedNumber => {
                // Success!  This is our final state
                console.log('Number purchased! Phone number is: '+ purchasedNumber.phoneNumber);

                // update user with payment & incoming number
                User.update({
                    _id: user._id
                }, {
                    $push: {
                        payments: paymentObject,
                    },
                    incomingCountryCode: '+1',
                    incomingPhoneNumber: purchasedNumber.phoneNumber.split('+1')[1],
                    incomingPhoneNumberSid: purchasedNumber.sid,
                    incomingCombinedPhoneNumber: purchasedNumber.phoneNumber,
                    incomingPhoneNumberExpiration: moment().add(1, 'months'),
                }, function(err, numberAffected, rawResponse) {
                    if (err) {
                        console.log('There was an error pushing incoming number & payments for: ' + user.username);
                    }

                    console.log('User updated with incoming phone number');

                    // send email to user
                    // locals to feed through to template
                    var locals = {'moment': moment, 'user': user, 'payment': paymentObject, 'config': config, 'strings': strings, 'number': purchasedNumber};

                    var htmlEmail = pug.renderFile('views/email/paymentIncoming.pug', locals);
                    var subject = "Your new incoming number with Transcord!";

                    emailHelper.sendEmail(user, subject, htmlEmail);

                    // send the new user to their dashboard
                    res.render('paymentIncomingSuccess', {
                        'user': user,
                        'payment': paymentObject,
                        'tim': tim,
                        'strings': strings,
                        
                    });
                });
            }).catch(function(error) {
                // Handle any error from any of the steps...
                console.error('Buying the number failed. Reason: '+error.message);

                // send the new user to their dashboard
                res.render('incomingNumberFailed', {
                    'user': user,
                    'payment': paymentObject,
                    'tim': tim,
                    'strings': strings,
                    
                });
            }).finally(function() {
                // This optional function is *always* called last, after all other callbacks
                // are invoked.  It's like the "finally" block of a try/catch
                console.log('Call buying process complete.');
            });
        } else {
            /******* THIS IS FOR REGULAR PAMENTS */
            // TO DO: Update new balance
            if(user.balance !== 'undefined' && user.balance) {
                user.balance = user.balance + data.transaction.tenders[0].amount_money.amount;
            } else {
                user.balance = data.transaction.tenders[0].amount_money.amount;
            }
            

            // Push it to the user object
            User.update({
                _id: user._id
            }, {
                $push: {
                    payments: paymentObject,
                },
                balance: user.balance
            }, function(err, numberAffected, rawResponse) {
                if (err) {
                    console.log('There was an error updating payments & balance for user: ' + user.username);
                }
            });

            console.log("Balance is now: " + user.balance);

            // send email to user
            // locals to feed through to template
            var locals = {'moment': moment, 'user': user, 'payment': paymentObject, 'config': config, 'strings': strings};

            var htmlEmail = pug.renderFile('views/email/payment.pug', locals);
            var subject = "Your payment to Transcord!";

            emailHelper.sendEmail(user, subject, htmlEmail);



            res.render('paymentSuccess', {
                'user': user,
                'payment': paymentObject,
                'tim': tim,
                'strings': strings,
                
            });
        }

        
	}, function(error) {
        console.log(error);
        // Parse the object sent back by square, and display it to the user
        var errorsObject = JSON.parse(error.response.res.text);
        console.log("Payment failed: " + error.response.res.text);
        // TODO: need to handle payment failure
		res.render('paymentFailure', {
            'user': user,
            'error': errorsObject.errors[0],
            'tim': tim,
            'strings': strings,
            
		});
	});


/*
    res.render('processPayment', {
        user: req.user,
    }); */
}

dashController.recordings = function(req, res) {
  if (!req.user) {
      req.session.redirectTo = req.originalUrl;
      return res.redirect('/login');
  }

  // check for a negative balance and force payment
  if(req.user.balance<0) {
    return res.redirect('/dashboard/payment');
  }

  res.render('recordings', {
      user: req.user,
      tim: tim,
      strings: strings,
  });
}

dashController.ajaxSearchRecordings = function(req, res) {
    res.setHeader('Content-Type', 'application/json');

    if(!req.user) {
        return res.status(404).send('Not found');
    }

    // empty reply object
    var reply = {};

    // get the user
    var user = req.user;

    // try and parse the page number, or stick with the default
    var page = 1;
    try {
        if(req.body.page) page = parseInt(req.body.page);
    } catch(err) {
        console.log(err);
    }

    // build metadata
    reply.metadata = {
        'pages': Math.ceil(user.recordings.length/config.pagination_count),
        'page': page, // TODO: try this, catch error?
        'calls': user.recordings.length
    }

    // get the starting place
    var position = (page-1)*10;

    // reverse ordering of recordings and slice the number of records to show
    user.recordings = user.recordings.reverse().slice(position,position+config.pagination_count);

    // if no search, send full results
    if(!req.body.search || req.body.search.length == 0) {
        reply.recordings = user.recordings;
        // TODO: maybe dump the transcript to save bandwidth?
        //console.log(reply);
        return res.send(JSON.stringify(reply));
    }

    // capture search data
    reply.metadata.search = req.body.search;
    var search = req.body.search;

    var options = {
        shouldSort: true,
        threshold: 0.6,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: [
          "transcriptionLeft",
          "transcriptionRight"
        ]
      };
      var fuse2 = new fuse(user.recordings, options); // "list" is the item array
      var result = fuse2.search(search);

      // capture the results and count the number of pages
      reply.recordings = result;
      reply.metadata.pages = Math.ceil(reply.recordings.length/config.pagination_count);
      reply.metadata.calls = reply.recordings.length;

      return res.send(JSON.stringify(reply));
}

dashController.transcript = function(req, res) {
  if (!req.user) {
      req.session.redirectTo = req.originalUrl;
      return res.redirect('/login');w
  }

  // check for a negative balance and force payment
  if(req.user.balance<0) {
    return res.redirect('/dashboard/payment');
  }

  // find the recording we want to display and get its transcription available
  req.user.recordings = req.user.recordings.filter(function(x){return x.recordingSid==req.params.recordingSid});

  if(req.user.recordings.length == 0) 
    res.redirect('/dashboard');
  
  // TODO: this is how we used to do it
  //var transcription = JSON.parse(req.user.recordings[0].transcription);

  // TODO: we shouldn't need this really
  var transcription = transcriptionHelper.buildTranscription(JSON.parse(req.user.recordings[0].transcriptionLeft), JSON.parse(req.user.recordings[0].transcriptionRight));

  res.render('transcript', {
      user: req.user,
      transcription: transcription,
      tim: tim,
      strings: strings,
      recording: req.user.recordings[0]
  });
}

dashController.ajaxSendTranscript = function(req, res) {
    res.setHeader('Content-Type', 'application/json');

    if(!req.user) {
        return res.status(404).send('Not found');
    }

    // generate token to send to user
    var uuid = uuidv1();

    var shareToken = {
        "token": uuid,
        "date": moment()
    };

    User.update({
        _id: req.user._id,
        "recordings.recordingSid": req.body.recordingSid
    }, {
        $push: {
            "recordings.$.shareTokens": shareToken
        }
    }, function(err, numberAffected, rawResponse) {
        if (err) {
            // TODO: this should be a throw, move res.render in here, and put a generic error screen in the catch
            console.log('There was an error');
        }

        console.log(shareToken);

        // find the recording we want to download
        req.user.recordings = req.user.recordings.filter(function(x){return x.recordingSid==req.body.recordingSid});

        // build transcript object
        var transcription = JSON.stringify(transcriptionHelper.buildTranscription(JSON.parse(req.user.recordings[0].transcriptionLeft), JSON.parse(req.user.recordings[0].transcriptionRight)));
        req.user.recordings[0].transcription = transcription;

        generateShareTranscriptEmail(req.user, req.body.email, req.user.recordings[0], shareToken);

        var response = {
            "email": req.body.email,
            "recordingSid": req.body.recordingSid,
            "status": "Success",
            "message": "Email sent"
        };

        res.send(JSON.stringify(response));

        /*
        var locals = {'moment': moment, 'user': user, 'passwordReset': passwordReset, 'config': config, 'strings': strings};

        var htmlEmail = pug.renderFile('views/email/reset.pug', locals);
        var subject = "Password reset";

        emailHelper.sendEmail(user, subject, htmlEmail); */
    });

    

}

dashController.sharedTranscript = function(req, res) {
    // if we didn't receive the required parameters bounce them to home
    console.log(req.params);

    if(typeof req.params.recordingSid === 'undefined' || typeof req.params.token === 'undefined') {
        res.redirect('/');
    }

    var recordingSid = req.params.recordingSid;
    var token = req.params.token;

    User.findOne({
        recordings: {
            $elemMatch: {
                'recordingSid': recordingSid,
                'shareTokens': {
                    $elemMatch: {
                        'token': token
                    }
                }
            }
        }
    })
    .then(function(user) {
        if(user == null) {
            console.log('invalid share token used, redirecting');
            res.redirect('/');
        } else {
            console.log("found user: " + user.name);

            // find the recording we want to show
            user.recordings = user.recordings.filter(function(x){return x.recordingSid==recordingSid});

            // check tokens
            user.recordings[0].shareTokens = user.recordings[0].shareTokens.filter(function(x){return x.token==token});

            if(moment().diff(moment(user.recordings[0].shareTokens[0].date).add(config.sharetoken_timeout, 'minutes')) < 0) {
                console.log("Allowing share access for transcript: " + recordingSid);
                
                var transcription = transcriptionHelper.buildTranscription(JSON.parse(user.recordings[0].transcriptionLeft), JSON.parse(user.recordings[0].transcriptionRight));

                res.render('transcript', {
                    //user: user,
                    transcription: transcription,
                    tim: tim,
                    strings: strings,
                    recording: user.recordings[0]
                });
            } else {
                console.log("Reset was too old for: " + recordingSid);
                req.session['status'] = "This share token has expired.";
                res.redirect('/');
            }
        }
    });


    // TODO: Display the transcript
    console.log('hello');
}

dashController.ajaxDeleteRecording = function(req, res) {
    res.setHeader('Content-Type', 'application/json');

    if(!req.user) {
        return res.status(404).send('Not found');
    } 

    User.update({
        _id: req.user._id
    }, {
        $pull: {"recordings": {"recordingSid": req.body.recordingSid }}
    }, function(err, numberAffected, rawResponse) {
        if (err) {
            return res.send(JSON.stringify({
                "status": "Error",
                "message": "There was an error trying to delete the recording"
            }))

            console.log('There was an error trying to delete the recording');
        }

        var response = {
            "recordingSid": req.body.recordingSid,
            "status": "Success",
            "message": "Recording deleted"
        };
    
        res.send(JSON.stringify(response));
    });
    
    
}

dashController.deleteRecording = function(req, res) {
    if (!req.user) {
        req.session.redirectTo = req.originalUrl;
        return res.redirect('/login');
    }

    // check for a negative balance and force payment
    if(req.user.balance<0) {
        return res.redirect('/dashboard/payment');
    }

    User.update({
        _id: req.user._id
    }, {
        $pull: {"recordings": {"recordingSid": req.params.recordingSid }}
    }, function(err, numberAffected, rawResponse) {
        if (err) {
            console.log('There was an error');
        }

        res.redirect('/dashboard');  
    });

}

// pull the file from google and stream it to the person with the right file name
dashController.downloadRecording = function(req, res) {
    if (!req.user) {
        req.session.redirectTo = req.originalUrl;
        return res.redirect('/login');w
    }

    // check for a negative balance and force payment
    if(req.user.balance<0) {
        return res.redirect('/dashboard/payment');
    }

    // find the recording we want to download
    req.user.recordings = req.user.recordings.filter(function(x){return x.recordingSid==req.params.recordingSid});

    if(req.user.recordings.length == 0) 
      res.redirect('/dashboard');  

    res.setHeader('Content-disposition', 'attachment; filename=Transcord between ' + req.user.recordings[0].numberFromFormatted + ' and ' + req.user.recordings[0].numberCalledFormatted + '.wav');

    https.get(req.user.recordings[0].recordingUrl, function(file) {
        file.pipe(res);
    });
    
}

/*
 * THIS WAS MY JSON APPROACH
 */
/*
dashController.transcript = function(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (!req.user)
    res.status(404).send('Not found');

  var response = {"message": "hello"};

  res.send(JSON.stringify(response));

}
*/

module.exports = dashController;


// functions
function generateShareTranscriptEmail(user, recipientEmail, recording, shareToken) {
    var transcription = JSON.parse(recording.transcription);

    // locals to feed through to template
    var locals = {'moment': moment, 'user': user, 'recording': recording, 'transcription': transcription, 'shareToken': shareToken, 'config': config, 'strings': strings};

    // loop through transcription object and build up the email
    var htmlEmail = pug.renderFile('views/email/transcript.pug', locals);

    var subject = user.name + ' shared a call transcript with you';``

    var recipient = {
        email: recipientEmail
    };

    // send the email
    emailHelper.sendEmail(recipient, subject, htmlEmail);

}