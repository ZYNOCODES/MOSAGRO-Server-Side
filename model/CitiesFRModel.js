const mongoose = require('mongoose');

const citiesFRSchema = new mongoose.Schema({
    codeW: {
        type: Number,
        required: true
    },
    wilaya: {
        type: String,
        required: true
    },
    codeC: {
        type: Number,
        required: true
    },
    baladiya: {
        type: String,
        required: true
    },
},{
    timestamps: true,
    collection: 'citiesFR'
});

const citiesFR = mongoose.model('citiesFR', citiesFRSchema);

module.exports = citiesFR;