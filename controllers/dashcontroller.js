var mongoose = require("mongoose");
var passport = require("passport");
var User = require("../models/user");

var moment = require("moment");
var ce = require('cloneextend');

var dashController = {};


// Go to registration page
dashController.list = function(req, res) {
  console.log("hello");

  if (!req.user) {
      return res.redirect('/login');
  }

  var user = ce.clone(req.user);

/*
  // TODO: pre-render the dates before sending it to Jade
  for (var i=0; i<user.recordings.length; i++) {
	console.log(moment(user.recordings[i].startTime).format('MMMM Do YYYY, h:mm a'));
	user.recordings[i].push({startTime = moment(user.recordings[i].startTime).format('MMMM Do YYYY, h:mm a');
  } */

  user.recordings.forEach(function(recording) { recording.test = 'blah'; });

  console.log(user);


  res.render('list', {
      user: user,
  });
};

module.exports = dashController;
