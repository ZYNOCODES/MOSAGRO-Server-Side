const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
    code:{
        type: String,
        required: true
    },
    store:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'store',
        required: true
    },
    client:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    products: [{
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
    total:{
        type: Number,
        required: true
    },
    date:{
        type: Date,
        required: true
    },
    type:{
        type: String,
        enum: ['delivery', 'pickup'],
        default: 'delivery',
        required: true
    },
    deliveredLocation:{
        type: String,
        required: false
    },
    expextedDeliveryDate:{
        type: Date,
        required: false
    },
    delivered:{
        type: Boolean,
        required: true,
        default: false
    },
    status:{
        type: Number,
        required: true,
        default: 0
    }
},{
    timestamps: true,
    collection: 'receipt'
});

const receipt = mongoose.model('receipt', receiptSchema);

module.exports = receipt;