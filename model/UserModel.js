const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true
    },
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
    email: {
        type: String,
        required: false
    },
    storeAddresses: {
        type: Array,
        required: true
    },
    wilaya:{
        type: String,
        required: true
    },
    commune:{
        type: String,
        required: true
    },
    r_commerce:{
        type: String,
        required: true
    },
    stores:{
        type: Array,
        required: false
    },
},{
    timestamps: true,
    collection: 'user'
});

const User = mongoose.model('user', UserSchema);

module.exports = User;