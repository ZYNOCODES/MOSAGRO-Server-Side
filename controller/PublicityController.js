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
    //check if Aucune publicité trouvée
    if (!publicities || publicities.length <= 0) {
        const err = new CustomError('Aucune publicité trouvée', 404);
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
    //check if Aucune publicité trouvée
    if (!publicities || publicities.length <= 0) {
        const err = new CustomError('Aucune publicité trouvée', 404);
        return next(err);
    }
    res.status(200).json(publicities);
});

//fetch all store publicities by store id from admin
const fetchAllStorePublicitiesFromAdmin = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    if (!store || !mongoose.Types.ObjectId.isValid(store)) {
        const err = new CustomError('Tous les champs sont obligatoires', 400);
        return next(err);
    }
    const publicities = await Publicity.find({
        owner: store,
        ownerModel: 'store',
    });
    //check if Aucune publicité trouvée
    if (!publicities || publicities.length <= 0) {
        const err = new CustomError('Aucune publicité trouvée', 404);
        return next(err);
    }

    res.status(200).json(publicities);
});

//fetch all store publicities by store id
const fetchAllStorePublicities = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    if (!store || !mongoose.Types.ObjectId.isValid(store)) {
        const err = new CustomError('Tous les champs sont obligatoires', 400);
        return next(err);
    }
    const publicities = await Publicity.find({
        owner: store,
        ownerModel: 'store',
    });
    //check if Aucune publicité trouvée
    if (!publicities || publicities.length <= 0) {
        const err = new CustomError('Aucune publicité trouvée', 404);
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
    //check if Aucune publicité trouvée
    if (!publicities || publicities.length <= 0) {
        const err = new CustomError('Aucune publicité trouvée', 404);
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
        const err = new CustomError('Tous les champs sont obligatoires', 400);
        return next(err);
    }
    //check if image is provided
    if(!req.file || req.file == undefined){
        const err = new CustomError('L\'image est requise', 400);
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
        const err = new CustomError('Erreur lors de la creation d\'une publicité, réessayez', 400);
        return next(err);
    }
    res.status(200).json({ message: 'Publicité créée avec succès' });
});

//create publicity from admin
const createPublicityFromAdmin = asyncErrorHandler(async (req, res, next) => {
    //check if user is admin
    const admin = req.user._id;
    if (!admin) {
        const err = new CustomError('Tous les champs sont obligatoires', 400);
        return next(err);
    }
    //check if image is provided
    if(!req.file || req.file == undefined){
        const err = new CustomError('L\'image est requise', 400);
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
        const err = new CustomError('Erreur lors de la creation d\'une publicité, réessayez', 400);
        return next(err);
    }
    res.status(200).json({ message: 'Publicité créée avec succès' });
});

//update publicity by id from admin to public
const makePublicityPublic = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        const err = new CustomError('Tous les champs sont obligatoires', 400);
        return next(err);
    }
    const publicity = await Publicity.findByIdAndUpdate(id, {
        distination: 'public',
        displayPublic: true
    });
    //check if Publicité non trouvée
    if (!publicity) {
        const err = new CustomError('Publicité non trouvée', 404);
        return next(err);
    }
    res.status(200).json({ message: 'Publicité mise à jour avec succès' });
});

//delete publicity by id from admin
const deletePublicityFromAdmin = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        const err = new CustomError('Tous les champs sont obligatoires', 400);
        return next(err);
    }
    const publicity = await Publicity.findByIdAndDelete(id);
    //check if Publicité non trouvée
    if (!publicity) {
        const err = new CustomError('Publicité non trouvée', 404);
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

    res.status(200).json({ message: 'Publicité supprimée avec succès' });
});

//delete publicity by id from store
const deletePublicityFromStore = asyncErrorHandler(async (req, res, next) => {
    const { id, store } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id) ||
        !store || !mongoose.Types.ObjectId.isValid(store)
    ) {
        const err = new CustomError('Tous les champs sont obligatoires', 400);
        return next(err);
    }
    const publicity = await Publicity.findByIdAndDelete(id);
    //check if Publicité non trouvée
    if (!publicity) {
        const err = new CustomError('Publicité non trouvée', 404);
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

    res.status(200).json({ message: 'Publicité supprimée avec succès' });
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