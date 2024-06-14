const mongoose = require('mongoose');

const priceSchema = new mongoose.Schema({
    
},{
    timestamps: true,
    collection: 'price'
});

const price = mongoose.model('price', priceSchema);

module.exports = price;