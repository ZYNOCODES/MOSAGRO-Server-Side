const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
    password: {
        type: String,
        required: false,
        default: null
    },
    firstName: {
        type: String,
        required: false,
        default: null
    },
    lastName: {
        type: String,
        required: false,
        default: null
    },
    phoneNumber: {
        type: String,
        required: false,
        default: null
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
        required: false,
        default: null
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
        required: false,
        default: null
    },
    commune:{
        type: Number,
        required: false,
        default: null
    },
    r_commerce:{
        type: String,
        required: false,
        default: null
    },
    status:{
        type: String,
        enum: ['En attente', 'Active', 'Suspended'],
        default: 'En attente',
        required: true
    },
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