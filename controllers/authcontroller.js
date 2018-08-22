let config = require('../env.json')[process.env.NODE_ENV || "development"];
process.env.TWILIO_ACCOUNT_SID = config.twilio_account_sid; // Pass account to environment as required by api
process.env.TWILIO_AUTH_TOKEN = config.twilio_auth_token; // Pass token to environment as required by api
const twilioClient = require('twilio')(config.twilio_account_sid, config.twilio_auth_token);
var mongoose = require("mongoose");
var passport = require("passport");
var User = require("../models/user");
var Rate = require("../models/rate");
const moment = require('moment');
const pug = require('pug');
const emailHelper = require("../helpers/emailHelper");
const uuidv1 = require('uuid/v1');
const tim = require('tinytim').tim;
const strings = require('../strings.json');

var userController = {};

// Restrict access to root page
userController.home = function(req, res) {
    res.render('index', {
        user: req.user,
        tim: tim,
        strings: strings,
    });
};

// Go to privacy page
userController.privacy = function(req, res) {
    res.render('privacy', {          
        tim: tim,
        strings: strings,
    });
}

// Go to registration page
userController.register = function(req, res) {
    //if there's already a user
    if (req.user) {
        req.session.redirectTo = req.originalUrl;
        return res.redirect('/dashboard');
    }

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
            rate: theRate,            
            tim: tim,
            strings: strings,
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
        user: req.user,            
        tim: tim,
        strings: strings,
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
                // locals to feed through to template
                var locals = {'moment': moment, 'user': user};

                var plaintextEmail = "Hello " + user.name;
                var htmlEmail = pug.renderFile('views/email/welcome.pug', locals);
                var subject = "Welcome to Transcord!";

                emailHelper.sendEmail(user, subject, plaintextEmail, htmlEmail);

                console.log("switch: " + req.body.incomingPhoneNumber);

                // register a new number for them now -- TODO move redirect below here
                if(req.body.incomingPhoneNumber) {
                    twilioClient
                        .availablePhoneNumbers('US')
                        .local.list({
                            inRegion: 'CA',
                        })
                        .then(data => {
                            var number = data[0];

                            console.log(number);

                            passport.authenticate('local')(req, res, function() {
                                res.redirect('/dashboard');
                            });

                            var success = twilio.incomingPhoneNumber
                                .create({
                                    friendlyName: "Incoming number for user: " + user.username,
                                    phoneNumber: number.phoneNumber,
                                    voiceUrl: 'https://transcord.app/ivr/incomingcall'
                                })
                                .then(function(result) {
                                    console.log('Registered incoming number: ' + number.phoneNumber + ' for: ' + user.username);

                                    User.update({
                                        _id: req.user._id
                                    }, {
                                        incomingCountryCode: '+1',
                                        incomingPhoneNumber: number.phoneNumber.split('+1')[1],
                                        incomingCombinedPhoneNumber: number.phoneNumber,
                                        incomingPhoneNumberExpiration: moment().add(1, 'months'),
                                    }, function(err, numberAffected, rawResponse) {
                                        if (err) {
                                            console.log('There was an error');
                                        }

                                        console.log('User updated with incoming phone number');

                                        // send the new user to their dashboard
                                        passport.authenticate('local')(req, res, function() {
                                            res.redirect('/dashboard');
                                        });
                                    });
                                }).done();
                        });
                } else {
                    // send the new user to their dashboard
                    passport.authenticate('local')(req, res, function() {
                        res.redirect('/dashboard');
                    });
                }
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
                        tim: tim,
                        status: 'Updated',
                        strings: strings,
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
    // if there's already a user, go to the dashboard
    if (req.user) {
        req.session.redirectTo = req.originalUrl;
        return res.redirect('/dashboard');
    }

    var status = req.session['status'];
    req.session['status'] = null; // wipe out the status now we've seen it

    res.render('login', {
        tim: tim,
        status: status,
        strings: strings,
    });
};

// Post login
userController.doLogin = function(req, res) {
    passport.authenticate('local', function(err, user, info) {
        if (err) {
            return console.log(err);
        }
        if (!user) {
            req.session['status'] = 'Username or password not recognized.';
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

    console.log("status: " + req.session['status']);
    var status = req.session['status'];
    req.session['status'] = null; // wipe out the status now we've seen it

    // show the main password reset page
    res.render('reset',{
        tim: tim,
        status: status,
        strings: strings,
    });

    
}

// Primary function here is to actually send the reset email to the user
userController.sendReset = function(req, res) {
    var email = req.body.email;

    User.findOne({
        email: email,
    })
    .then(function(user) {
        if (user == null) {
            console.log("Password reset requested for invalid user: " + email);
            // No user found so do nothing
        } else {
            var uuid = uuidv1();

            var passwordReset = {
                "token": uuid,
                "date": moment(),
                "used": 0,
            };

            user.passwordResets.push(passwordReset);

            console.log(user.passwordResets);

            User.update({
                _id: user._id
            }, {
                "passwordResets": user.passwordResets
            }, function(err, numberAffected, rawResponse) {
                if (err) {
                    console.log('There was an error');
                }
        
                var locals = {'moment': moment, 'user': user, 'passwordReset': passwordReset};

                var plaintextEmail = "Hello " + user.name;
                var htmlEmail = pug.renderFile('views/email/reset.pug', locals);
                var subject = "Password reset";

                emailHelper.sendEmail(user, subject, plaintextEmail, htmlEmail);
            });
        }
    })
    .catch(function(err) {
        console.log(err);
    });

    res.render('resetSuccess', {           
        tim: tim,
        status: "Password reset successful",
        strings: strings,
    });
}

// Handles the incoming link from the users email and processes the reset and collects the new password
userController.checkReset = function(req, res) {
    // if somehow we've got no token let's go back to home
    if(typeof req.params.token === 'undefined') {
        res.redirect('/');
    }

    var token = req.params.token;

    User.findOne({
        passwordResets: {
            $all: [{
                "$elemMatch": {
                    "token": token,
                }
            }]
        }
    })
    .then(function(user) {
        if (user == null) {
            console.log("Password reset page loaded for invalid token: " + token);

            req.session['status'] = 'This password reset link was not found.';
            res.redirect('/');
            // No match found so do nothing
        } else {
            // find the password reset
            user.passwordResets = user.passwordResets.filter(function(x){return x.token==token});

            if(moment().diff(moment(user.passwordResets[0].date).add(config.password_reset_timeout, 'minutes')) < 0) { // if the password reset is less than 15 minutes
                console.log("Allowing reset password for: " + user.email);
            
                res.render('resetAction', {
                    'token': token,            
                    tim: tim,
                    strings: strings,
                });
            } else {
                console.log("Reset was too old for: " + user.email);
                req.session['status'] = "This password reset link has expired.";
                res.redirect('/reset');
            }

            
            
        }
    })
    .catch(function(err) {
        console.log(err);
    });
    
    //? req.params.rateCode : 'DEFAULT'

}

userController.doReset = function(req,res) {
    if(typeof req.body.token === 'undefined' || typeof req.body.password === 'undefined') {
        console.log("")
        res.redirect('/');
    }

    var token = req.body.token;

    // refresh the user object
    User.findOne({
        passwordResets: {
            $all: [{
                "$elemMatch": {
                    "token": token,
                }
            }]
        }
    })
    .then(function(user) {
        if (user == null) {
            console.log("Tried to reset a password but couldn't find the user")
            res.redirect('/');
            // TODO: we should never reach here?
        } else {
            if (req.body.password !== "") {
                user.setPassword(req.body.password, function() {
                    user.save();
                    console.log("Password saved");
                });

                User.update({
                    _id: user._id
                }, {
                    "passwordResets": {}
                }, function(err, numberAffected, rawResponse) {
                    if (err) {
                        console.log('There was an error');
                    }

            
                    // send email
                    var locals = {'moment': moment, 'user': user};

                    var plaintextEmail = "Hello " + user.name;
                    var htmlEmail = pug.renderFile('views/email/resetDone.pug', locals);
                    var subject = "Password changed";

                    emailHelper.sendEmail(user, subject, plaintextEmail, htmlEmail);

                    console.log("Password reset for: " + user.email);
                    req.session['status'] = "Password reset.";
                    res.redirect('/login'); // TODO: should sent a note to the screen

                });


            } else {
                req.session['status'] = "Please provide a password.";
                res.redirect('/reset/token/' + token); // let's try again // TODO: this should have an error message?
            }
        }
    })
    .catch(function(err) {
        console.log(err);
    });
};

// logout
userController.logout = function(req, res) {
    req.logout();
    res.redirect('/');
};

module.exports = userController;
