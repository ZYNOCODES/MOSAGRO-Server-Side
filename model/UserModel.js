const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    password: {
        type: String,
        required: true
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
        required: true
    },
    phoneVerification: {
        type: Boolean,
        required: true,
        default: false
    },
    email: {
        type: String,
        required: false
    },
    emailVerification: {
        type: Boolean,
        required: true,
        default: false
    },
    storeAddresses: [{
        name:{
            type: String,
            required: true
        },
        address:{
            type: String,
            required: true
        },
        location:{
            type: String,
            required: false,
            default: null
        },
    }],
    wilaya:{
        type: String,
        required: true,
    },
    commune:{
        type: String,
        required: true
    },
    r_commerce:{
        type: String,
        required: false
    },
    isRCVerified:{
        type: Boolean,
        required: true,
        default: false
    },
    isBlocked:{
        type: Boolean,
        required: true,
        default: false
    },
},{
    timestamps: true,
    collection: 'client'
});

const User = mongoose.model('client', UserSchema);

module.exports = User;