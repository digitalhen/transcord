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
userController.profile = function(req, res) {
    if (!req.user) {
        return res.redirect('/login');
    }

    res.render('profile', {
        user: req.user
    });
};

// Post registration
userController.doRegister = function(req, res) {
    User.register(new User({
        username: req.body.username,
        name: req.body.name,
        email: req.body.email,
        phoneNumber: req.body.phoneNumber
    }), req.body.password, function(err, user) {
        if (err) {
            return res.render('register', {
                user: user
            });
        }

        passport.authenticate('local')(req, res, function() {
            res.redirect('/');
        });
    });
};

// User update
userController.doUpdate = function(req, res) {
    if (!req.user) {
        return res.redirect('/login');
    }

    User.update({
        _id: req.user._id
    }, {
        username: req.body.username,
        name: req.body.name,
        email: req.body.email,
        phoneNumber: req.body.phoneNumber
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


                    res.render('profile', {
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
    var response = {};

    if (req.body.username) {
        User.findOne({
                username: req.body.username
            })
            .then(function(user) {
                if (user == null) {
                    response.exists = false;
                    // TODO: we should never reach here?
                } else {
                    response.exists = true;
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
                    response.exists = false;
                    // TODO: we should never reach here?
                } else {
                    response.exists = true;
                }

                res.send(JSON.stringify(response));
            })
            .catch(function(err) {
                console.log(err);
            });
    } else if (req.body.phoneNumber) {

        User.findOne({
                phoneNumber: req.body.phoneNumber
            })
            .then(function(user) {
                if (user == null) {
                    response.exists = false;
                    // TODO: we should never reach here?
                } else {
                    response.exists = true;
                }

                res.send(JSON.stringify(response));
            })
            .catch(function(err) {
                console.log(err);
            });
    } else {
        res.send("Invalid request");
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
            //Areturn res.redirect('/users/' + user.username);
            return res.redirect('/');
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
