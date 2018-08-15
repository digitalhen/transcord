'use strict';
let config = require('../env.json')[process.env.NODE_ENV || "development"];
const mongoose = require('mongoose');


mongoose.Promise = Promise;

// Mongo cloud
exports.mongoConnection = mongoose.connect(config.mongo_uri)
	.then(() => console.log("Database connected successfully"))
	.catch((err) => console.error(err));
