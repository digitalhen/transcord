var mongoose = require("mongoose");
var passport = require("passport");
var User = require("../models/user");

var userController = {};

// Restrict access to root page
userController.home = function(req, res) {
  res.render('index', { user : req.user });
};

// Go to registration page
userController.register = function(req, res) {
  res.render('register');
};

// Go to profile page
userController.profile = function(req, res) {
    if (!req.user) { return res.redirect('/login'); }

	res.render('profile', { user : req.user });
};

// Post registration
userController.doRegister = function(req, res) {
  User.register(new User({ username : req.body.username, name: req.body.name, email: req.body.email, phoneNumber: req.body.phoneNumber }), req.body.password, function(err, user) {
    if (err) {
      return res.render('register', { user : user });
    }

    passport.authenticate('local')(req, res, function () {
      res.redirect('/');
    });
  });
};

// User update
userController.doUpdate = function(req, res) {
	/*User.update({_id: req.session.passport.user.id}, {
        	name: req.body.name,
		username: req.body.username,
		phoneNumber: req.body.phoneNumber,
		email: req.body.email,
    	}, function (err){
        	console.log(err);
	});*/

	User
    .findOneAndUpdate({ _id: req.session.passport.user }, {
		name: req.body.name,
                username: req.body.username,
                phoneNumber: req.body.phoneNumber,
                email: req.body.email,
	})
    .exec(function(err, user) {
       if (err) return res.render('profile', {
	 user: req.session.passport.user
         //err: err.message
       });
	console.log(user);
	console.log(err);
       return res.render('profile', {
         user: req.session.passport.user
       });
     });
   
};

// Go to login page
userController.login = function(req, res) {
  res.render('login');
};

// Post login
userController.doLogin = function(req, res) {
  passport.authenticate('local', function(err, user, info) {
    if (err) { return console.log(err); }
    if (!user) { return res.redirect('/login'); }
    req.logIn(user, function(err) {
      if (err) { return console.log(err); }
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
