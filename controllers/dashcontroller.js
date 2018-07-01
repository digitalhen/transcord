var mongoose = require("mongoose");
var passport = require("passport");
var User = require("../models/user");

var dashController = {};


// Go to registration page
dashController.list = function(req, res) {
  console.log("hello");

  if (!req.user) {
      return res.redirect('/login');
  }

  // TODO: pre-render the dates before sending it to Jade

  res.render('list', {
      user: req.user
  });
};

module.exports = dashController;
