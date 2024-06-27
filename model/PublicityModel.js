const mongoose = require('mongoose');

const publicitySchema = new mongoose.Schema({
    store:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'store',
        required: true
    },
    products: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'stock',
            required: true
        },
        title: {
            type: String,
            required: false,
        },
        distination: {
            type: String,
            enum: ['private', 'public'],
            default: 'private',
            required: true
        },
        display: {
            type: Boolean,
            required: true,
            default: true,
        },
    }],
},{
    timestamps: true,
    collection: 'publicity'
});

const publicity = mongoose.model('publicity', publicitySchema);

module.exports = publicity;