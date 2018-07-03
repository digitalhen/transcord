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

dashController.transcript = function(req, res) {
  if (!req.user) {
      return res.redirect('/login');
  }

  // find the recording we want to display and get its transcription available
  req.user.recordings = req.user.recordings.filter(function(x){return x.recordingSid==req.params.recordingSid});
  var transcription = JSON.parse(req.user.recordings[0].transcription);

  res.render('transcript', {
      user: req.user,
      transcription: transcription
      //recording: recording
  });
}

/*
 * THIS WAS MY JSON APPROACH
 */
/*
dashController.transcript = function(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (!req.user)
    res.status(404).send('Not found');

  var response = {"message": "hello"};

  res.send(JSON.stringify(response));

}
*/

module.exports = dashController;
