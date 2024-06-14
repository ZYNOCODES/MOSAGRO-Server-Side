const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
    
},{
    timestamps: true,
    collection: 'receipt'
});

const receipt = mongoose.model('receipt', receiptSchema);

module.exports = receipt;