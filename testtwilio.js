// Download the Node helper library from twilio.com/docs/node/install
// These identifiers are your accountSid and authToken from
// https://www.twilio.com/console
const accountSid = 'AC49d2769efd6385b71033a141d04b16ca';
const authToken = '7d922456626f90fbf6ea4a8ef8fa21a8';
const client = require('twilio')(accountSid, authToken);

// Find and then purchase a phone number
client
  .availablePhoneNumbers('US')
  .local.list({
    inRegion: 'CA',
  })
  .then(data => {
      data.forEach(function(number) {
        console.log(number.phoneNumber);
      });
    const number = data[0];
    //return client.incomingPhoneNumbers.create({
      //phoneNumber: number.phoneNumber,
    //});
  })
  //.then(purchasedNumber => console.log(purchasedNumber.sid));