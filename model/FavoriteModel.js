const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
    
},{
    timestamps: true,
    collection: 'favorite'
});

const favorite = mongoose.model('favorite', favoriteSchema);

module.exports = favorite;