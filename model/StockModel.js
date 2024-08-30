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
    buyingMathode: {
        type: String,
        enum: ['both', 'box', 'unity'],
        default: 'both',
        required: true
    },
    quantityLimit: {
        type: Number,
        required: false,
        default: 0
    },
    destocking: {
        type: Number,
        required: false,
        default: 0
    }
},{
    timestamps: true,
    collection: 'stock'
});

const stock = mongoose.model('stock', stockSchema);

module.exports = stock;