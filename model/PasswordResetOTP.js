const mongoose = require('mongoose');

const passwordResetOTPSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    accountType: {
        type: String,
        enum: ['client', 'store'],
        required: true
    },
    phoneNumber: {
        type: String,
        required: true
    },
    otp: {
        type: String,
        required: true
    },
    verified: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 3600
    },
    expiresAt: {
        type: Date,
        required: true
    }
}, {
    timestamps: false,
    collection: 'PasswordResetOTP'
});

const PasswordResetOTP = mongoose.model('PasswordResetOTP', passwordResetOTPSchema);

module.exports = PasswordResetOTP;