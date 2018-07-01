var mongoose = require("mongoose");
var passport = require("passport");
var User = require("../models/user");

var moment = require("moment");

var dashController = {};


// Go to registration page
dashController.list = function(req, res) {
  if (!req.user) {
      return res.redirect('/login');
  }

  res.render('list', {
      user: user,
  });
};

module.exports = dashController;
