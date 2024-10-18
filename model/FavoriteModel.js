const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'client',
        required: true
    },
    products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'stock',
    }]
},{
    timestamps: true,
    collection: 'favorite'
});

const favorite = mongoose.model('favorite', favoriteSchema);

module.exports = favorite;