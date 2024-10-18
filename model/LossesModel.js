const mongoose = require('mongoose');

const lossesSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'ownerModel',
        required: true
    },
    ownerModel: {
        type: String,
        enum: ['store', 'admin'],
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