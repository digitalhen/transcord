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
	zip: Number,
	countryCode: String,
	phoneNumber: String,
	combinedPhoneNumber: String,
	incomingCountryCode: String,
	incomingPhoneNumber: String,
	incomingPhoneNumberSid: String,
	incomingCombinedPhoneNumber: String,
	incomingPhoneNumberExpiration: Date,
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
			transcriptionPlainText: String,
			transcriptionLeft: String,
			transcriptionRight: String,
			processingStatus: Number,
			shareTokens: [
				{
					token: String,
					date: Date
				}
			]
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
	],
	passwordResets: [ // tracks password requests 
		{
			token: String,
			date: Date, // date of request
			used: Number, // 1 == used, 0 == not used
		}
	],
	blockList: [  // list of phone numbers to block
		String
	],
	dummyValue: String // used for empty unsets
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', UserSchema);
