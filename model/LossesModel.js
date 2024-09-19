const mongoose = require('mongoose');

const lossesSchema = new mongoose.Schema({
    store: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'store',
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    date: {
        type: String,
        required: true
    }
},{
    timestamps: true,
    collection: 'losses'
});

const losses = mongoose.model('losses', lossesSchema);

module.exports = losses;