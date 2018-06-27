const User = require('./src/models/user');
require('./src/helpers/connectionHelper');

console.log("Running DB test...");

User.findOne({phoneNumber: '+14156694558'})
	.then(function(blah) {
		if(blah==null) {
			console.log("No match");
		} else {
			console.log(blah);
		}
	})
	.catch(function(err) {
		console.log(err);
	});

