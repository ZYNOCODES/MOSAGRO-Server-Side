const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    name:{
        type: String,
        required: true
    },
    duration:{
        type: Number,
        required: true
    }
},{
    timestamps: true,
    collection: 'subscription'
});

const subscription = mongoose.model('subscription', subscriptionSchema);

module.exports = subscription;