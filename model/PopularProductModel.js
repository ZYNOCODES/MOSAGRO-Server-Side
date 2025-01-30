const mongoose = require('mongoose');

const popularProductSchema = new mongoose.Schema({
    store:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'store',
        required: true
    },
    stock: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'stock',
        required: true
    }
},{
    timestamps: true,
    collection: 'popularProduct'
});

const popularProduct = mongoose.model('popularProduct', popularProductSchema);

module.exports = popularProduct;