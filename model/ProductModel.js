const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    code:{
        type: String,
        required: true
    },
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
        type: String,
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