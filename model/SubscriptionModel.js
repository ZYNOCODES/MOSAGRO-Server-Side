const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    
},{
    timestamps: true,
    collection: 'subscription'
});

const subscription = mongoose.model('subscription', subscriptionSchema);

module.exports = subscription;