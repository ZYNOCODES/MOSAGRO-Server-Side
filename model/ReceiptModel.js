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
    total:{
        type: Number,
        required: true
    },
    profit:{
        type: Number,
        required: true
    },
    date:{
        type: String,
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
        required: false,
        default: null
    },
    expextedDeliveryDate:{
        type: String,
        required: false,
        default: null
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
    },
    credit:{
        type: Boolean,
        required: true,
        default: false
    },
    deposit:{
        type: Boolean,
        require: true,
        default: false
    },
    payment:[
        {
            date:{
                type: String,
                required: true
            },
            amount:{
                type: Number,
                required: true
            }
        }
    ],
},{
    timestamps: true,
    collection: 'receipt'
});

const receipt = mongoose.model('receipt', receiptSchema);

module.exports = receipt;