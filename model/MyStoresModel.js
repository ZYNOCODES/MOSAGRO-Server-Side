const mongoose = require('mongoose');

const myStoresSchema = new mongoose.Schema({
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    store: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'store',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
        required: true
    },
    isSeller: {
        type: Boolean,
        default: false
    }
},{
    timestamps: true,
    collection: 'myStores'
});

const myStores = mongoose.model('myStores', myStoresSchema);

module.exports = myStores;