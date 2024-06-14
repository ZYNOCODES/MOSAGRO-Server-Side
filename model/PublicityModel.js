const mongoose = require('mongoose');

const publicitySchema = new mongoose.Schema({
    
},{
    timestamps: true,
    collection: 'publicity'
});

const publicity = mongoose.model('publicity', publicitySchema);

module.exports = publicity;