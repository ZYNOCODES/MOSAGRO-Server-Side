const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
    name:{
        type: String,
        required: true
    },
    image:{
        type: String,
        required: true
    }
},{
    timestamps: true,
    collection: 'brand'
});

const brand = mongoose.model('brand', brandSchema);

module.exports = brand;