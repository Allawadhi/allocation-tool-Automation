
var nodemailer = require("nodemailer");

var transport = nodemailer.createTransport("SMTP", {
    host: "smtp.gmail.com", // hostname
    secureConnection: true, // use SSL
    port: 465, // port for secure SMTP
    auth: {
        user: "saurabh.allawadhi@quovantis.com",
        pass: "pkt7_143"
    }
});

console.log("SMTP Configured");

var mailOptions = {
    from: 'saurabh.allawadhi@quovantis.com', // sender address
    to: 'saurabh.allawadhi@quovantis.com', // list of receivers
    subject: 'Report for Test Result', // Subject line
    text: 'Contains the test result for the smoke test in html file', // plaintext body
    attachments: [
        {
            // 'filename': 'Results.html',
            // 'filePath': './Reports/Results.html',
            'filename': 'report.html',
            'filePath': '../tmp/screenshots/reports.html',
        }

    ]
};
transport.sendMail(mailOptions, function (error, response) {
    if (error) {
        console.log(error);
    } else {
        console.log("Message sent: " + response.message);
    }

});
