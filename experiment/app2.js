var express = require('express');
var app     = express();
var http    = require('http');
var https   = require('https');
var request = require('request');
var fs      = require('fs');
var path    = require('path');
var ffmpeg = require('fluent-ffmpeg');
var storage = require('@google-cloud/storage');

const PROJECT_ID = 'transcord-2018';

// storage root of project
global.__basedir = __dirname;

var gcs = storage({
	projectId: PROJECT_ID,
	keyFilename: '../credentials/google.json'
});

console.log('hi!');

let bucket = gcs.bucket('transcord.app');

function downloadFile() {
    var file     = "https://api.twilio.com/2010-04-01/Accounts/AC49d2769efd6385b71033a141d04b16ca/Recordings/REf0a5d27d08b78476f9c5a01a06344dab"; 

    var filename = path.basename( file );
    var ssl      = file.split(':')[0];
    var dest     = __basedir + '/downloads/'+ filename;
    var stream   = fs.createWriteStream( dest + '.wav' );

        https.get( file, function( resp ) {
            resp.pipe( stream );

		console.log('File downloaded');

	    var right = ffmpeg(dest + '.wav')
				.inputFormat('wav')
				.audioChannels(2)
				.audioBitrate('64k')
				.outputOptions('-map_channel 0.0.1')
				.on('end', function() {
					bucket.upload(dest + '-right.wav', (err, file) => {
						console.log('Uploading right file.');
						fs.unlink(dest + '-right.wav', (err, file) => {
                        				console.log('Deleting right file.');
						});	
                			});	
				})
				.save(dest + '-right.wav');

		console.log('Right file saved');

		var left = ffmpeg(dest + '.wav')
                                .inputFormat('wav')
                                .audioChannels(2)
                                .audioBitrate('64k')
                                .outputOptions('-map_channel 0.0.0')
				.on('end', function() {
					bucket.upload(dest + '-left.wav', (err, file) => {
                                                console.log('Uploading left file.');
                                                fs.unlink(dest + '-left.wav', (err, file) => {
                                                        console.log('Deleting left file.');
                                                });
                                        });
				})
                                .save(dest + '-left.wav');

		console.log('Left file saved');

		bucket.upload(dest + '.wav', (err, file) => {
			console.log('Uploading main file.');
			// if it's ok upload?
			fs.unlink(dest + '.wav', (err, file) => {
				console.log('Deleting main file.');
			});
		});

		bucket.file(filename + '.wav').getSignedUrl({
			action: 'read',
			expires: '03-09-2491'
		}).then(signedUrls => {
			console.log('Main file URL: ' + signedUrls[0]);	
		});

		
        }).on('error', function(e) {
            response.send("error connecting" + e.message);
        });
};

downloadFile();
