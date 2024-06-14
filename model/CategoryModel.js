const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    
},{
    timestamps: true,
    collection: 'category'
});

const category = mongoose.model('category', categorySchema);

module.exports = category;