const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    
},{
    timestamps: true,
    collection: 'user'
});

const User = mongoose.model('user', UserSchema);

module.exports = User;