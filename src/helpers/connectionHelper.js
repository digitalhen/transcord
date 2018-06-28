'use strict';

const mongoose = require('mongoose');

mongoose.Promise = Promise;
//exports.mongoConnection = mongoose.connect('mongodb//localhost/news-recorder');
exports.mongoConnection = mongoose.connect('mongodb://digitalhen:7q8URv8Vz6Ht5RgMRt8Y9y0H8AS7sHvtFxtZuvtmjUvObuZjjqy7oUXL6bVgohWdoW7myZRWS5iOVkUcFezbgw%3D%3D@digitalhen.documents.azure.com:10255/newsrecorder?ssl=true');

console.log('Database connection is now in state ' + mongoose.connection.readyState);


