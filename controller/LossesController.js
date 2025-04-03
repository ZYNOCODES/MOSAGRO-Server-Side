const mongoose = require('mongoose');
const validator = require('validator');
const Losses = require('../model/LossesModel');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const moment = require('../util/Moment.js');
const LossesService = require('../service/LossesService');

//store

//fetch all losses
const GetAllLossesForStore = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    //get all losses by store id
    const losses = await Losses.find({
        owner: store,
        ownerModel: 'store'
    });
    //check if there are no losses
    if(!losses || losses.length < 1){
        const err = new CustomError('Aucune perte trouvé', 404);
        return next(err);
    }
    res.status(200).json(losses);
});
//create a loss
const CreateLossForStore = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    const { price, reason } = req.body;
    //get current date
    const currentDateTime = moment.getCurrentDateTime();
    // Validate required fields
    if (!price || !reason) {
        return next(new CustomError('Tous les champs sont obligatoires', 400));
    }
    //check if price is a number
    if(!validator.isNumeric(price.toString()) || Number(price) < 0){
        return next(new CustomError('Le prix doit être un nombre positif', 400));
    }

    //create a new loss
    const newLoss = await Losses.create({
        owner: store,
        ownerModel: 'store',
        price,
        reason: reason.toString(),
        date: currentDateTime
    });
    //check if loss was created
    if(!newLoss){
        const err = new CustomError('Erreur lors de la création de la perte, réessayez.', 400);
        return next(err);
    }

    res.status(200).json({message: 'Perte créée avec succès'});
});
//delete a loss
const DeleteLossForStore = asyncErrorHandler(async (req, res, next) => {
    const { id, store } = req.params;
    //check if all required fields are provided
    if(!id || !mongoose.Types.ObjectId.isValid(id)){
        const err = new CustomError('Tous les champs sont obligatoires', 400);
        return next(err);
    }

    //check if loss exists
    const existingLoss = await LossesService.findLossesByIdAndStore(id, store);
    if(!existingLoss){
        const err = new CustomError('Perte non trouvée', 404);
        return next(err);
    }

    //delete loss
    const deletedLoss = await existingLoss.deleteOne();

    //check if loss was deleted
    if(!deletedLoss){
        const err = new CustomError('Erreur lors de la suppression de la perte, réessayez.', 400);
        return next(err);
    }

    res.status(200).json({message: 'Perte supprimée avec succès'});
});
//get statistics losses for specific store
const GetStatisticsForStore = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    // Get statistics for the store
    const existingLosses = await Losses.find({ 
        owner: store,
        ownerModel: 'store'
    }).select('price');
    //check if there are no losses
    if(existingLosses.length < 1){
        return next(new CustomError('Aucune perte trouvé', 404));
    }

    // Calculate the total losses
    const count = existingLosses.length;
    let total = 0;

    existingLosses.forEach((loss) => {
        if (loss.price >= 0) {
            total += loss.price;
        }
    });


    // Respond with the statistics
    res.status(200).json({
        count: count,
        total: total,
    });
});

//admin
//fetch all losses
const GetAllLossesForAdmin = asyncErrorHandler(async (req, res, next) => {
    const { admin } = req.params;
    //get all losses by admin id
    const losses = await Losses.find({
        owner: admin,
        ownerModel: 'admin'
    });
    //check if there are no losses
    if(!losses || losses.length < 1){
        const err = new CustomError('Aucune perte trouvé', 404);
        return next(err);
    }
    res.status(200).json(losses);
});
//create a loss
const CreateLossForAdmin = asyncErrorHandler(async (req, res, next) => {
    const { admin } = req.params;
    const { price, reason } = req.body;
    //get current date
    const currentDateTime = moment.getCurrentDateTime();
    // Validate required fields
    if (!price || !reason) {
        return next(new CustomError('Tous les champs sont obligatoires', 400));
    }
    //check if price is a number
    if(!validator.isNumeric(price.toString()) || Number(price) < 0){
        return next(new CustomError('Le prix doit être un nombre positif', 400));
    }

    //create a new loss
    const newLoss = await Losses.create({
        owner: admin,
        ownerModel: 'admin',
        price,
        reason: reason.toString(),
        date: currentDateTime
    });
    //check if loss was created
    if(!newLoss){
        const err = new CustomError('Erreur lors de la création de la perte, réessayez.', 400);
        return next(err);
    }

    res.status(200).json({message: 'Perte créée avec succès'});
});
//delete a loss
const DeleteLossForAdmin = asyncErrorHandler(async (req, res, next) => {
    const { id, admin } = req.params;
    //check if all required fields are provided
    if(!id || !mongoose.Types.ObjectId.isValid(id)){
        const err = new CustomError('Tous les champs sont obligatoires', 400);
        return next(err);
    }

    //check if loss exists
    const existingLoss = await LossesService.findLossesByIdAndAdmin(id, admin);
    if(!existingLoss){
        const err = new CustomError('Perte non trouvée', 404);
        return next(err);
    }

    //delete loss
    const deletedLoss = await existingLoss.deleteOne();

    //check if loss was deleted
    if(!deletedLoss){
        const err = new CustomError('Erreur lors de la suppression de la perte, réessayez.', 400);
        return next(err);
    }

    res.status(200).json({message: 'Perte supprimée avec succès'});
});
//get statistics losses for specific store
const GetStatisticsForAdmin = asyncErrorHandler(async (req, res, next) => {
    const { admin } = req.params;
    // Get statistics for the admin
    const existingLosses = await Losses.find({ 
        owner: admin,
        ownerModel: 'admin'
    }).select('price');
    //check if there are no losses
    if(existingLosses.length < 1){
        return next(new CustomError('Aucune perte trouvé', 404));
    }

    // Calculate the total losses
    const count = existingLosses.length;
    let total = 0;

    existingLosses.forEach((loss) => {
        if (loss.price >= 0) {
            total += loss.price;
        }
    });


    // Respond with the statistics
    res.status(200).json({
        count: count,
        total: total,
    });
});

module.exports = {
    GetAllLossesForStore,
    CreateLossForStore,
    DeleteLossForStore,
    GetStatisticsForStore,
    GetAllLossesForAdmin,
    CreateLossForAdmin,
    DeleteLossForAdmin,
    GetStatisticsForAdmin
};