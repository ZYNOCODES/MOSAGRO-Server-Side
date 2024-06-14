const mongoose = require('mongoose');

const popularProductSchema = new mongoose.Schema({
    
},{
    timestamps: true,
    collection: 'popularProduct'
});

const popularProduct = mongoose.model('popularProduct', popularProductSchema);

module.exports = popularProduct;