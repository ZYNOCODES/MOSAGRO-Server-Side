const mongoose = require('mongoose');

const publicitySchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'ownerModel',
        required: true
    },
    ownerModel: {
        type: String,
        enum: ['store', 'admin'],
        required: true
    },
    distination: {
        type: String,
        enum: ['private', 'public'],
        default: 'private',
        required: true
    },
    displayPublic: {
        type: Boolean,
        default: false,
    },
    image: {
        type: String,
        required: true
    },
}, {
    timestamps: true,
    collection: 'publicity'
});

publicitySchema.pre('save', function (next) {
    if (this.ownerModel === 'admin') {
        this.distination = 'public';
        this.displayPublic = true;
    }else if(this.ownerModel === 'store'){
        this.displayPublic = false;
    }

    next();
});

const Publicity = mongoose.model('publicity', publicitySchema);

module.exports = Publicity;