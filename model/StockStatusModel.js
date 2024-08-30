const mongoose = require('mongoose');

const stockStatusSchema = new mongoose.Schema({
    stock: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'stock',
        required: true
    },
    status: [{
        date:{
            type: String,
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
        exparationDate: {
            type: String,
            required: false
        },
        end: {
            type: Boolean,
            required: true,
            default: false
        }
    }]
},{
    timestamps: true,
    collection: 'stockStatus'
});

const stockStatus = mongoose.model('stockStatus', stockStatusSchema);

module.exports = stockStatus;