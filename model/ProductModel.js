const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    
},{
    timestamps: true,
    collection: 'product'
});

const Product = mongoose.model('product', ProductSchema);

module.exports = Product;