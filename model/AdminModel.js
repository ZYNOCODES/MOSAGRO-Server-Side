const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    
},{
    timestamps: true,
    collection: 'admin'
});

const admin = mongoose.model('admin', adminSchema);

module.exports = admin;