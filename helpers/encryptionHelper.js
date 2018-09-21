let config = require('../env.json')[process.env.NODE_ENV || "development"];
var crypto = require('crypto');
var assert = require('assert');

// settings
var algorithm = 'aes256';
var key = config.mongo_secret;

var encryptionHelper = {};

encryptionHelper.decryptObject = function(encryptedObject) {
    return JSON.parse(this.decryptString(encryptedObject));   
}

encryptionHelper.encryptObject = function(plaintextObject) {
    return this.encryptString(JSON.stringify(plaintextObject));
}

encryptionHelper.decryptString = function(encryptedValue) {
    var decipher = crypto.createDecipher(algorithm, key);
    var decrypted = decipher.update(encryptedValue, 'hex', 'utf8') + decipher.final('utf8');

    return decrypted;
}

encryptionHelper.encryptString = function(plaintextValue) {
    var cipher = crypto.createCipher(algorithm, key);  
    var encrypted = cipher.update(plaintextValue, 'utf8', 'hex') + cipher.final('hex');

    return encrypted;
}

module.exports = encryptionHelper;