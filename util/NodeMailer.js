const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: process.env.AUTH_EMAIL, 
      pass: process.env.AUTH_PASSWORD,
    },
});

transporter.verify((error, success) => {
    if (error) {
        console.log(error);
    } else {
        console.log("Server is ready to take our messages");
    }
});

module.exports = {
    transporter
};