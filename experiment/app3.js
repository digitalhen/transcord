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

var gcs = storage({
	projectId: PROJECT_ID,
	keyFilename: 'auth.json'
});

console.log('hi!');

let bucket = gcs.bucket('transcord.app');

function downloadFile() {
		var filename = '';:

		bucket.file(filename + '.wav').getSignedUrl({
			action: 'read',
			expires: '03-09-2491'
		}).then(signedUrls => {
			console.log('Main file URL: ' + signedUrls[0]);	
		});

		
};

downloadFile();
