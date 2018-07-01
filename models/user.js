var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var passportLocalMongoose = require('passport-local-mongoose');

/*
const Recording = new mongoose.Schema({
  url: String,
  transcription: String,
  phoneNumber: String,
}); */

const UserSchema = new mongoose.Schema({
	username: String,
	name: String,
	password: String,
	email: String,
	phoneNumber: String,
	recordings: [
		{
			startTime: Date,
			endTime: Date,
			numberFrom: String,
			numberFromFormatted: String,
			bridgeNumber: String,
			numberCalled: String,
			numberCalledFormatted: String,
			duration: Double,
			recordingUrl: String
		}
	]
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', UserSchema);
