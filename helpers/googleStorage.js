var http = require('http');
var fs = require('fs');

var googleStorage = {};

exports.download = function(url, dest, cb) {
  var file = fs.createWriteStream(dest);
  var request = http.get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close(cb);  // close() is async, call cb after close completes.
    });
  }).on('error', function(err) { // Handle errors
    fs.unlink(dest); // Delete the file async. (But we don't check the result)
    if (cb) cb(err.message);
  });
};

// TODO: upload to google cloud as a full version
exports.

// TODO: split audio with ffmpeg

// TODO: upload to google cloud storage, the split audio versions

// TODO: send to transcription tool

// TODO: make a visualization of the conversation with speech bubbles


module.exports = googleStorage;
