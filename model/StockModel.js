const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
    
},{
    timestamps: true,
    collection: 'stock'
});

const stock = mongoose.model('stock', stockSchema);

module.exports = stock;