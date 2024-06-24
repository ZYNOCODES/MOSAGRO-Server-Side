const mongoose = require('mongoose');

const myStoresSchema = new mongoose.Schema({
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    stores: [{
        store: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Store',
            required: true
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
            required: true
        }
    }]
},{
    timestamps: true,
    collection: 'myStores'
});

const myStores = mongoose.model('myStores', myStoresSchema);

module.exports = myStores;