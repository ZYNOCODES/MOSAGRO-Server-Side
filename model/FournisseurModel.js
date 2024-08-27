const mongoose = require('mongoose');

const fournisseurSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
        required: true,
    },
    store: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'store'
    },
    address: {
        type: String,
        required: false,
        default: ''
    },
    wilaya: {
        type: Number,
        required: true,
    },
    commune: {
        type: Number,
        required: true,
    },
},{
    timestamps: true,
    collection: 'fournisseur'
});

const fournisseur = mongoose.model('fournisseur', fournisseurSchema);

module.exports = fournisseur;