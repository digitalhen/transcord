var mongoose = require("mongoose");
var passport = require("passport");
var User = require("../models/user");
var squareConnect = require('square-connect');


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
    
    console.log(transactions_api);
    
    transactions_api.charge(process.env.SQUARE_LOCATION, request_body).then(function(data) {
        console.log(data);
        
        // TO DO: Payment WAS successful. Update database
        
		res.render('processPayment', {
            user: req.user,
            payment: {
                'amount': amount/100,
            },
            
		});
	}, function(error) {
		console.log(error.status);
		res.render('processPayment', {
			payment: {
                'title': 'Payment Failure',
			    'result': "Payment Failed (see console for transaction output)"
            }
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
