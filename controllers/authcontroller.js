var mongoose = require("mongoose");
var passport = require("passport");
var User = require("../models/user");

var userController = {};

// Restrict access to root page
userController.home = function(req, res) {
    res.render('index', {
        user: req.user
    });
};

// Go to registration page
userController.register = function(req, res) {
    res.render('register');
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
    User.register(new User({
        username: req.body.username,
        name: req.body.name,
        email: req.body.email,
        emailNotification: true,
        privacyNotification: false,
        countryCode: '+1',
        phoneNumber: req.body.phoneNumber.replace(/\D/g,''),
        combinedPhoneNumber: '+1' + req.body.phoneNumber.replace(/\D/g,''),
    }), req.body.password, function(err, user) {
        if (err) {
            res.redirect('/dashboard');
            /*
            return res.render('register', {
                user: user
            }); */
        }

        passport.authenticate('local')(req, res, function() {
            res.redirect('/');
        });
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

// logout
userController.logout = function(req, res) {
    req.logout();
    res.redirect('/');
};

module.exports = userController;
