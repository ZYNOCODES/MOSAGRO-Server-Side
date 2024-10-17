const mongoose = require('mongoose');

const SousPurchaseSchema = new mongoose.Schema({
    sousStocks: [{
        sousStock:{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'stockStatus',
            required: true
        },
        quantity:{
            type: Number,
            required: true
        },
        price:{
            type: Number,
            required: true
        }
    }],
    date:{
        type: String,
        required: true
    },
},{
    timestamps: true,
    collection: 'SousPurchase'
});

const SousPurchase = mongoose.model('SousPurchase', SousPurchaseSchema);

module.exports = SousPurchase;