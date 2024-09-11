const mongoose = require('mongoose');

const EmailtOTPVerificationSchema = new mongoose.Schema({
    store:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'store',
        required: true
    },
    otp:{
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    expiresAt: {
        type: Date,
        default: Date.now,
    }
},{
    collection: 'emailtOTP'
});

const EmailtOTPVerification = mongoose.model('emailtOTP', EmailtOTPVerificationSchema);

module.exports = EmailtOTPVerification;