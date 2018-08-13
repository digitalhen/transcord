var mongoose = require("mongoose");
var passport = require("passport");
var User = require("../models/user");
var Rate = require("../models/rate");
const moment = require('moment');


var userController = {};

// Restrict access to root page
userController.home = function(req, res) {
    res.render('index', {
        user: req.user
    });
};

// Go to privacy page
userController.privacy = function(req, res) {
    res.render('privacy');
}

// Go to registration page
userController.register = function(req, res) {
    // if rate specified, look that up, else look up default
    var theRate = {
        description: '',
        rateCode: typeof req.params.rateCode !== 'undefined' ? req.params.rateCode : 'DEFAULT'
    };

    Rate.findOne({
        "rateCode": theRate.rateCode
    })
    .then(function(rate) {
        if(rate !== null) // if we found a valid rate, let's capture, otherwise we stick with the default.
            theRate = rate;
        // TODO: else if the rate has expired or been used too many times... then set the error message
        else {
            theRate.rateCode = 'DEFAULT';
        }
        
        res.render('register', {
            rate: theRate
        });
    })
    .catch(function(err) {
        console.log(err);
    });
};

// Go to profile page
userController.settings = function(req, res) {
    if (!req.user) {
        req.session.redirectTo = req.originalUrl;
        return res.redirect('/login');
    }

    if(typeof req.params.action !== 'undefined') {
        switch(req.params.action) {
            case 'unsubscribe':
                // TODO: turn off email notifications
                break;
        }
    };

    res.render('settings', {
        user: req.user
    });
};

// Post registration
userController.doRegister = function(req, res) {
    // TODO:
    // pull in the rate here and get the free balance
    // need to put in an entry in the ledger appropriately
    // reduce availability of the rate code by 1

    Rate.findOne({
        "rateCode": req.body.rateCode
    })
    .then(function(rate) {
        // calculate how much free balance to give
        var initialBalance = rate.costPerUnit * rate.freeUnits;

        User.register(new User({
            username: req.body.username,
            name: req.body.name,
            email: req.body.email,
            emailNotification: true,
            privacyNotification: false,
            countryCode: '+1',
            phoneNumber: req.body.phoneNumber.replace(/\D/g,''),
            combinedPhoneNumber: '+1' + req.body.phoneNumber.replace(/\D/g,''),
            balance: initialBalance,
            rateCode: rate.rateCode,
            payments: [
                {
                    id: "Initial",
                    date: moment(),
                    amount: initialBalance,
                }
            ]
        }), req.body.password, function(err, user) {
            if (err) {
                //res.redirect('/dashboard');
                res.redirect('/');
                console.log('Error registering user');
                console.log(err);
                /*
                return res.render('register', {
                    user: user
                }); */
            } else {
                
                passport.authenticate('local')(req, res, function() {
                    res.redirect('/dashboard');
                });
            }
    
        });

        // update the rate to count the use
        rate.useCount = rate.useCount + 1;

        Rate.update({
            _id: rate._id
        }, {
            useCount: rate.useCount,
        }, function(err, numberAffected, rawResponse) {
            if (err) {
                console.log('There was an error');
            }
        });
    })
    .catch(function(err) {
        console.log(err);
    });

    
};

// User update
userController.doUpdate = function(req, res) {
    if (!req.user) {
        req.session.redirectTo = req.originalUrl;
        return res.redirect('/login');
    }

    console.log("I'm in the update");

    User.update({
        _id: req.user._id
    }, {
        username: req.body.username,
        name: req.body.name,
        email: req.body.email,
        emailNotification: true, // TODO: feed this from the settings page
        privacyNotification: false, // TODO: feed this from the settings page
        countryCode: '+1',
        phoneNumber: req.body.phoneNumber.replace(/\D/g,''),
        combinedPhoneNumber: '+1' + req.body.phoneNumber.replace(/\D/g,''),
        // TODO: handle updating password somehow
    }, function(err, numberAffected, rawResponse) {
        if (err) {
            console.log('There was an error');
        }

        // refresh the user object
        User.findOne({
                _id: req.user._id
            })
            .then(function(user) {
                if (user == null) {
                    // TODO: we should never reach here?
                } else {
                    if (req.body.password !== "") {
                        user.setPassword(req.body.password, function() {
                            user.save();
                            console.log("Password saved");
                        });
                    }


                    res.render('settings', {
                        user: user,
                        status: {
                            message: "Updated"
                        }
                    });
                }
            })
            .catch(function(err) {
                console.log(err);
            });


    });
};

// validate
userController.validate = function(req, res) {
    res.setHeader('Content-Type', 'application/json');

    var response = {};

    if (req.body.username) {
        User.findOne({
                username: req.body.username
            })
            .then(function(user) {
                if (user == null) {
                    response = true;
                    // TODO: we should never reach here?
                } else {
                    response = false;
                }

                res.send(JSON.stringify(response));
            })
            .catch(function(err) {
                console.log(err);
            });
    } else if (req.body.email) {
        User.findOne({
                email: req.body.email
            })
            .then(function(user) {
                if (user == null) {
                    response = true;
                    // TODO: we should never reach here?
                } else {
                    response = false;
                }

                res.send(JSON.stringify(response));
            })
            .catch(function(err) {
                console.log(err);
            });
    } else if (req.body.phoneNumber) {

        User.findOne({
                countryCode: '+1',
                phoneNumber: req.body.phoneNumber.replace(/\D/g,'')
            })
            .then(function(user) {
                if (user == null) {
                    response = true;
                    // TODO: we should never reach here?
                } else {
                    response = false;
                }

                res.send(JSON.stringify(response));
            })
            .catch(function(err) {
                console.log(err);
            });
    } else {
        res.status(404).send('Not found');
    }



}

// Go to login page
userController.login = function(req, res) {
    res.render('login');
};

// Post login
userController.doLogin = function(req, res) {
    passport.authenticate('local', function(err, user, info) {
        if (err) {
            return console.log(err);
        }
        if (!user) {
            return res.redirect('/login');
        }
        req.logIn(user, function(err) {
            if (err) {
                return console.log(err);
            }

            // check if the user came in to an original url.... if so, go back to it
            var redirectTo = req.session.redirectTo ? req.session.redirectTo : '/dashboard';
            delete req.session.redirectTo;
            return res.redirect(redirectTo);
        });
        //})(req, res, next);
    })(req, res);

    /*
      passport.authenticate('local')(req, res, function () {
        res.redirect('/');
      }); */
};

// Presents the dialog to the user
userController.reset = function(req, res) {
    // show the main password reset page
    res.render('reset');
}

// Primary function here is to actually send the reset email to the user
userController.sendReset = function(req, res) {

}

// Handles the incoming link from the users email and processes the reset and collects the new password
userController.doReset = function(req, res) {

}

// logout
userController.logout = function(req, res) {
    req.logout();
    res.redirect('/');
};

module.exports = userController;
