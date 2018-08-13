var mongoose = require("mongoose");
var passport = require("passport");
var User = require("../models/user");
var squareConnect = require('square-connect');
const https   = require('https');
const moment = require('moment');
const jade = require('jade');
const emailHelper = require("../helpers/emailHelper");

var dashController = {};

// Go to registration page
dashController.dashboard = function(req, res) {
  if (!req.user) {
      req.session.redirectTo = req.originalUrl;
      return res.redirect('/login');
  }

  res.render('dashboard', {
      user: req.user,
  });
};

dashController.billing = function(req, res) {
  if (!req.user) {
      req.session.redirectTo = req.originalUrl;
      return res.redirect('/login');
  }

  res.render('billing', {
      user: req.user,
  });
}

dashController.payment = function(req, res) {
    if (!req.user) {
        req.session.redirectTo = req.originalUrl;
        return res.redirect('/login');
    }
  
    res.render('payment', {
        user: req.user,
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
    oauth2.accessToken = process.env.SQUARE_ACCESS_TOKEN;

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
        
    transactions_api.charge(process.env.SQUARE_LOCATION, request_body).then(function(data) {        
        // TO DO: Payment WAS successful. Update database

        console.log(data.transaction.tenders[0]);
        
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

        user.payments.push(paymentObject);

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
            payments: user.payments,
            balance: user.balance
        }, function(err, numberAffected, rawResponse) {
            if (err) {
                console.log('There was an error');
            }
        });

        console.log("Balance is now: " + user.balance);

        // send email to user
        // locals to feed through to template
        var locals = {'moment': moment, 'user': user, 'payment': paymentObject};

        var plaintextEmail = "Hello " + user.name;
        var htmlEmail = jade.renderFile('views/email/payment.jade', locals);
        var subject = "Your payment to Transcord!";

        emailHelper.sendEmail(user, subject, plaintextEmail, htmlEmail);



		res.render('paymentSuccess', {
            'user': user,
            'payment': paymentObject
            
		});
	}, function(error) {
        console.log(error.status);
        // TODO: need to handle payment failure
		res.render('paymentFailure', {
            'user': user,
            'error': error,
            
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

  res.render('recordings', {
      user: req.user,
  });
}

dashController.transcript = function(req, res) {
  if (!req.user) {
      req.session.redirectTo = req.originalUrl;
      return res.redirect('/login');w
  }

  // find the recording we want to display and get its transcription available
  req.user.recordings = req.user.recordings.filter(function(x){return x.recordingSid==req.params.recordingSid});

  if(req.user.recordings.length == 0) 
    res.redirect('/dashboard');
    
  var transcription = JSON.parse(req.user.recordings[0].transcription);

  res.render('transcript', {
      user: req.user,
      transcription: transcription
      //recording: recording
  });
}

dashController.deleteRecording = function(req, res) {
    if (!req.user) {
        req.session.redirectTo = req.originalUrl;
        return res.redirect('/login');
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
