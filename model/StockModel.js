const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product',
        required: true
    },
    store: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'store',
        required: true
    },
    price: [{
        buying: {
            type: String,
            required: true
        },
        selling: {
            type: String,
            required: true
        }
    }],
    quantity: {
        type: Number,
        required: true
    },
},{
    timestamps: true,
    collection: 'stock'
});

const stock = mongoose.model('stock', stockSchema);

module.exports = stock;