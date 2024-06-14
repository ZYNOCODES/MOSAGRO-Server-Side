const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
    
},{
    timestamps: true,
    collection: 'store'
});

const store = mongoose.model('store', storeSchema);

module.exports = store;