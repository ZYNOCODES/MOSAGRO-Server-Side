const mongoose = require('mongoose');

const citiesARSchema = new mongoose.Schema({
    codeW: {
        type: String,
        required: true
    },
    wilaya: {
        type: String,
        required: true
    },
    codeC: {
        type: String,
        required: true
    },
    baladiya: {
        type: String,
        required: true
    },
},{
    timestamps: true,
    collection: 'citiesAR'
});

const citiesAR = mongoose.model('citiesAR', citiesARSchema);

module.exports = citiesAR;