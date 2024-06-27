const mongoose = require('mongoose');

const popularProductSchema = new mongoose.Schema({
    store:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'store',
        required: true
    },
    products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'stock',
    }]
},{
    timestamps: true,
    collection: 'popularProduct'
});

const popularProduct = mongoose.model('popularProduct', popularProductSchema);

module.exports = popularProduct;