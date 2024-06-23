const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
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
    storeName: {
        type: String,
        required: true
    },
    storeAddress: {
        type: String,
        required: false
    },
    storeLocation: {
        type: String,
        required: false
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
    status:{
        type: String,
        required: true
    },
    subscriptions:{
        type: Array,
        required: false
    },
},{
    timestamps: true,
    collection: 'store'
});

const store = mongoose.model('store', storeSchema);

module.exports = store;