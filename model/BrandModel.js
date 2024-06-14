const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
    
},{
    timestamps: true,
    collection: 'brand'
});

const brand = mongoose.model('brand', brandSchema);

module.exports = brand;