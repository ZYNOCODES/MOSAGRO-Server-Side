const mongoose = require('mongoose');

const PurchaseSchema = new mongoose.Schema({
    store:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'store',
        required: true
    },
    fournisseur:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'fournisseur',
        required: true
    },
    date:{
        type: String,
        required: true
    },
    totalAmount:{
        type: Number,
        required: true
    },
    sousPurchases: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'sousPurchase',
        required: true
    }],
    credit:{
        type: Boolean,
        required: true,
        default: false
    },
    deposit:{
        type: Boolean,
        required: true,
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
    closed:{
        type: Boolean,
        required: true,
        default: false
    },
    discount:{
        type: Number,
        required: true,
        default: 0
    },
},{
    timestamps: true,
    collection: 'purchase'
});

const Purchase = mongoose.model('purchase', PurchaseSchema);

module.exports = Purchase;