'use strict';

const mongoose = require('mongoose');

mongoose.Promise = Promise;
exports.mongoConnection = mongoose.connect('mongodb://localhost/news-recorder');

console.log(mongoose.connection.readyState);


