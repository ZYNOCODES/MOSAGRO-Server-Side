const mongoose = require('mongoose');

const subscriptionStoreSchema = new mongoose.Schema({
    store:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'store',
        required: true
    },
    subscription:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'subscription',
        required: true
    },
    amount:{
        type: Number,
        required: true
    },
    validation:{
        type: Boolean,
        required: true,
        default: false
    },
    startDate: {
        type: Date,
        required: true
    },
    expiryDate: {
        type: Date,
        required: true
    },
},{
    timestamps: false,
    collection: 'subscriptionStore'
});

const subscription = mongoose.model('subscriptionStore', subscriptionStoreSchema);

module.exports = subscription;