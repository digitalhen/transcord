'use strict';
const mongoose = require('mongoose');

/*
const Recording = new mongoose.Schema({
  url: String,
  transcription: String,
  phoneNumber: String,
}); */

const User = new mongoose.Schema({
	name: String,
	email: String,
	phoneNumber: String,
});

const user = mongoose.model('user', User);
module.exports = user;



