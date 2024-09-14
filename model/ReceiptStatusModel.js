const mongoose = require('mongoose');

const receiptStatusSchema = new mongoose.Schema({
    products: [{
        stock:{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'stock',
            required: true
        },
        product:{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'product',
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
    collection: 'receiptStatus'
});

const receiptStatus = mongoose.model('receiptStatus', receiptStatusSchema);

module.exports = receiptStatus;