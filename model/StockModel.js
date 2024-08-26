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
    buying: {
        type: Number,
        required: true
    },
    selling: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    quantityLimit: {
        type: Number,
        required: true,
        default: 0
    },
    buyingMathode: {
        type: String,
        enum: ['both', 'box', 'unity'],
        default: 'both',
        required: true
    },
},{
    timestamps: true,
    collection: 'stock'
});

const stock = mongoose.model('stock', stockSchema);

module.exports = stock;