var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var passportLocalMongoose = require('passport-local-mongoose');

/*
const Recording = new mongoose.Schema({
  url: String,
  transcription: String,
  phoneNumber: String,
}); */

const RateSchema = new mongoose.Schema({
    rateCode: String,
    availabilityExpDate: Date, // when is this no longer available for new signups
    existingExpDate: Date, // when does this terminate for existing customers
    description: String,
    costPerUnit: Number, // how much to charge per block
    unitLength: Number, // how long is a block? we should probably call it 60, ie. 60 seconds / 1 minute
    freeUnits: Number, // how much time is free?
    useCount: Number, // how many times has this rate been used
    useLimit: Number // what's the limit of this rate?
});

//RateSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('Rate', RateSchema);
