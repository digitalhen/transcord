var mongoose = require("mongoose");
var passport = require("passport");
var User = require("../models/user");

var dashController = {};


// Go to registration page
dashController.list = function(req, res) {
  if (!req.user) {
      return res.redirect('/login');
  }



  res.render('list', {
      user: req.user,
  });
};

module.exports = dashController;
