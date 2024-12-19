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
        ref: 'client',
        required: true
    },
    products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'receiptStatus',
        required: true
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
    deliveredLocation: {
        type: {
          name: {
            type: String,
            required: function() {
              return this.deliveredLocation != null;
            },
          },
          address: {
            type: String,
            required: function() {
              return this.deliveredLocation != null; 
            },
          },
          location: {
            type: String,
            default: null,
          },
        },
        required: false, 
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