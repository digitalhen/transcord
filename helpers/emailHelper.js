let config = require('../env.json')[process.env.NODE_ENV || "development"];
const nodemailer = require('nodemailer');

var emailHelper = {};

emailHelper.sendEmail = function(user, subject, plaintext, html) {
    // send the email but check if users wants it first
    if(user.emailNotification !== 'undefined' && !user.emailNotification) {
        console.log('User has emails turned off, so not sending: ' + user.email);
        return; // returns if the have a email notification set to false
    }

    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        host: config.email_host,
        port: config.email_port,
        auth: {
            user: config.email_user,
            pass: config.email_pass
        },
    });


    // setup email data with unicode symbols
    let mailOptions = {
        from: '"' + config.email_from_name + '" <' + config.email_from + '>', // sender address
        to: user.email, // list of receivers
        subject: subject, // Subject line
        text: plaintext,
        // plain text body
        /*html: 'Dear ' + name + ',<br/><br/><b>Thank you for using News Recorder!</b><br/>' +
            '<a href="' + recordingUrl + '">Click here to listen to your ' + duration + ' second call.</a><br/><br/>' +
            htmlTranscript */
        html: html,
        // html body
    };

    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message sent to: ' + user.email + ' with ID: ' + info.messageId);

        // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
    });
}

module.exports = emailHelper;