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
    phoneVerification: {
        type: Boolean,
        required: true,
        default: false
    },
    email: {
        type: String,
        required: false,
        default: null
    },
    emailVerification: {
        type: Boolean,
        required: true,
        default: false
    },
    storeName: {
        type: String,
        required: true
    },
    storeAddress: {
        type: String,
        required: false,
        default: null
    },
    storeLocation: {
        type: String,
        required: false,
        default: null
    },
    wilaya:{
        type: Number,
        required: true
    },
    commune:{
        type: Number,
        required: true
    },
    r_commerce:{
        type: String,
        required: true
    },
    status:{
        type: String,
        enum: ['En attente', 'Active', 'Suspended'],
        default: 'En attente',
        required: true
    },
    subscriptions:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'subscriptionStore',
        required: true
    }],
    categories:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'category',
        required: true
    }],
},{
    timestamps: true,
    collection: 'store'
});

const store = mongoose.model('store', storeSchema);

module.exports = store;