const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name:{
        type: String,
        required: true
    },
    subName:{
        type: String,
        required: false
    },
    size:{
        type: String,
        required: true
    },
    brand:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'brand',
        required: true
    },
    category:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'category',
        required: true
    },
    image:{
        type: String,
        required: true
    },
    boxItems:{
        type: Number,
        required: true
    }
},{
    timestamps: true,
    collection: 'product'
});

const Product = mongoose.model('product', ProductSchema);

module.exports = Product;