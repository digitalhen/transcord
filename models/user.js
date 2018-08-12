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
	emailNotification: Boolean,
	privacyNotification: Boolean,
	countryCode: String,
	phoneNumber: String,
	combinedPhoneNumber: String,
	incomingPhoneNumber: String,
	recordings: [ // this can be deleted by the user
		{
			recordingSid: String,
			direction: Number,
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
	],
	balance: Number,
	rateCode: String,
	calls: [ // Nothing in this table gets deleted
		{
			callSid: String,
			dialCallSid: String,
			direction: Number,
			duration: Number,
			rateCode: String, // capture the rate code at the time of the call
			cost: Number // we should use the rate code at the time and capture the cost
		}
	],
	payments: [
		{
			id: String,
			transactionId: String,
			date: Date,
			amount: Number,
			currency: String,
			cardBrand: String,
			cardLast4: String,
		}
	]
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', UserSchema);
