const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    ownerModel: {
        type: String,
        enum: ['store', 'client'],
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'ownerModel',
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['subscription_expiry', 'order_ready', 'order_delivered', 'store_access_request', 'store_access_approved', 'store_access_rejected'],
        required: true
    },
    read: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    collection: 'notification'
});

const Notification = mongoose.model('notification', notificationSchema);

module.exports = Notification;