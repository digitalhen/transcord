var mongoose = require("mongoose");
var passport = require("passport");
var User = require("../models/user");

var moment = require("moment");
var ne = require('node-each');

var dashController = {};


// Go to registration page
dashController.list = function(req, res) {
  console.log("hello");

  if (!req.user) {
      return res.redirect('/login');
  }

  var user = req.user;

  // TODO: pre-render the dates before sending it to Jade
  ne.each(user.recordings, function(el, i) {
    el.startTimeFormatted = moment(el.startTime).format('MMMM Do YYYY, h:mm a');
  });

  console.log(user);

  res.render('list', {
      user: user,
  });
};

module.exports = dashController;
