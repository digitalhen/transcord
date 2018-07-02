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
	countryCode: String,
	phoneNumber: String,
	combinedPhoneNumber: String,
	recordings: [
		{
			recordingSid: String,
			startTime: Date,
			endTime: Date,
			numberFrom: String,
			numberFromFormatted: String,
			bridgeNumber: String,
			numberCalled: String,
			numberCalledFormatted: String,
			duration: Number,
			recordingUrl: String,
			recordingUrlLeft: String,
			recordingUrlRight: String,
			transcription: String,
			transcriptionLeft: String,
			transcriptionRight: String,
		}
	]
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', UserSchema);
