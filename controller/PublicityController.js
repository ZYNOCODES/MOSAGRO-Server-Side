const Publicity = require('../model/PublicityModel');
const mongoose = require('mongoose');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const validator = require('validator');
const fs = require('fs');
const path = require('path');

//fetch all admin public publicities
const fetchAllAdminPublicPublicities = asyncErrorHandler(async (req, res, next) => {
    const publicities = await Publicity.find({
        ownerModel: 'admin',
        distination: 'public',
        displayPublic: true
    });
    //check if no publicities found
    if (!publicities || publicities.length <= 0) {
        const err = new CustomError('No publicities found', 404);
        return next(err);
    }
    res.status(200).json(publicities);
});

//fetch all store public publicities
const fetchAllStorePublicPublicities = asyncErrorHandler(async (req, res, next) => {
    const publicities = await Publicity.find({
        ownerModel: 'store',
        distination: 'public',
        displayPublic: false
    }).populate({
        path: 'owner',
        select: 'firstName lastName phoneNumber'
    });
    //check if no publicities found
    if (!publicities || publicities.length <= 0) {
        const err = new CustomError('No publicities found', 404);
        return next(err);
    }
    res.status(200).json(publicities);
});

//fetch all store publicities by store id from admin
const fetchAllStorePublicitiesFromAdmin = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    if (!store || !mongoose.Types.ObjectId.isValid(store)) {
        const err = new CustomError('Invalid store id', 400);
        return next(err);
    }
    const publicities = await Publicity.find({
        owner: store,
        ownerModel: 'store',
    });
    //check if no publicities found
    if (!publicities || publicities.length <= 0) {
        const err = new CustomError('No publicities found', 404);
        return next(err);
    }

    res.status(200).json(publicities);
});

//fetch all store publicities by store id
const fetchAllStorePublicities = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    if (!store || !mongoose.Types.ObjectId.isValid(store)) {
        const err = new CustomError('Invalid store id', 400);
        return next(err);
    }
    const publicities = await Publicity.find({
        owner: store,
        ownerModel: 'store',
    });
    //check if no publicities found
    if (!publicities || publicities.length <= 0) {
        const err = new CustomError('No publicities found', 404);
        return next(err);
    }

    res.status(200).json(publicities);
});

//fetch all public publicities
const fetchAllPublicPublicities = asyncErrorHandler(async (req, res, next) => {
    const publicities = await Publicity.find({
        distination: 'public',
        displayPublic: true
    });
    //check if no publicities found
    if (!publicities || publicities.length <= 0) {
        const err = new CustomError('No publicities found', 404);
        return next(err);
    }
    res.status(200).json(publicities);
});

//create publicity from store
const createPublicityFromStore = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    const { distination } = req.body;
    if (!store || !mongoose.Types.ObjectId.isValid(store) ||
        !distination || !validator.isIn(distination, ['private', 'public'])) {
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    //check if image is provided
    if(!req.file || req.file == undefined){
        const err = new CustomError('Image is required', 400);
        return next(err);
    }
    const filename = req.file.filename;

    const publicity = await Publicity.create({
        owner: store,
        ownerModel: 'store',
        distination,
        displayPublic: false,
        image: filename
    });
    //check if publicity not created
    if (!publicity) {
        const err = new CustomError('Publicity not created, try again', 400);
        return next(err);
    }
    res.status(200).json({ message: 'Publicity created successfully' });
});

//create publicity from admin
const createPublicityFromAdmin = asyncErrorHandler(async (req, res, next) => {
    //check if user is admin
    const admin = req.user._id;
    if (!admin) {
        const err = new CustomError('Invalid user id', 400);
        return next(err);
    }
    //check if image is provided
    if(!req.file || req.file == undefined){
        const err = new CustomError('Image is required', 400);
        return next(err);
    }
    const filename = req.file.filename;

    const publicity = await Publicity.create({
        owner: admin,
        ownerModel: 'admin',
        distination: 'public',
        displayPublic: true,
        image: filename
    });
    //check if publicity not created
    if (!publicity) {
        const err = new CustomError('Publicity not created, try again', 400);
        return next(err);
    }
    res.status(200).json({ message: 'Publicity created successfully' });
});

//update publicity by id from admin to public
const makePublicityPublic = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        const err = new CustomError('Invalid publicity id', 400);
        return next(err);
    }
    const publicity = await Publicity.findByIdAndUpdate(id, {
        distination: 'public',
        displayPublic: true
    });
    //check if publicity not found
    if (!publicity) {
        const err = new CustomError('Publicity not found', 404);
        return next(err);
    }
    res.status(200).json({ message: 'Publicity updated successfully' });
});

//delete publicity by id from admin
const deletePublicityFromAdmin = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        const err = new CustomError('Invalid publicity id', 400);
        return next(err);
    }
    const publicity = await Publicity.findByIdAndDelete(id);
    //check if publicity not found
    if (!publicity) {
        const err = new CustomError('Publicity not found', 404);
        return next(err);
    }

    // Delete the image file from the server
    const imagePath = path.join(__dirname, '..', 'files', publicity.image);
    fs.access(imagePath, fs.constants.F_OK, (err) => {
        if (err) {
            console.log('Image not found or already deleted:', err);
        } else {
            fs.unlink(imagePath, (unlinkErr) => {
                if (unlinkErr) {
                    console.log('Error deleting image:', unlinkErr);
                }
            });
        }
    });

    res.status(200).json({ message: 'Publicity deleted successfully' });
});

//delete publicity by id from store
const deletePublicityFromStore = asyncErrorHandler(async (req, res, next) => {
    const { id, store } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id) ||
        !store || !mongoose.Types.ObjectId.isValid(store)
    ) {
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    const publicity = await Publicity.findByIdAndDelete(id);
    //check if publicity not found
    if (!publicity) {
        const err = new CustomError('Publicity not found', 404);
        return next(err);
    }

    
    // Delete the image file from the server
    const imagePath = path.join(__dirname, '..', 'files', publicity.image);
    fs.access(imagePath, fs.constants.F_OK, (err) => {
        if (err) {
            console.log('Image not found or already deleted:', err);
        } else {
            fs.unlink(imagePath, (unlinkErr) => {
                if (unlinkErr) {
                    console.log('Error deleting image:', unlinkErr);
                }
            });
        }
    });

    res.status(200).json({ message: 'Publicity deleted successfully' });
});


module.exports = {
    fetchAllAdminPublicPublicities,
    fetchAllStorePublicPublicities,
    fetchAllStorePublicitiesFromAdmin,
    fetchAllStorePublicities,
    fetchAllPublicPublicities,
    createPublicityFromStore,
    createPublicityFromAdmin,
    deletePublicityFromAdmin,
    deletePublicityFromStore,
    makePublicityPublic,
}