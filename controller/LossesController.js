const mongoose = require('mongoose');
const validator = require('validator');
const Losses = require('../model/LossesModel');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const moment = require('../util/Moment.js');
const StoreService = require('../service/StoreService');
const LossesService = require('../service/LossesService');

//fetch all losses
const GetAllLosses = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    //check if all required fields are provided
    if(!id || !mongoose.Types.ObjectId.isValid(id)){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    //check if store exists
    const store = await StoreService.findStoreById(id);
    if(!store){
        const err = new CustomError('Store not found', 404);
        return next(err);
    }
    //get all losses by store id
    const losses = await Losses.find({
        store: store._id
    });
    //check if there are no losses
    if(!losses || losses.length < 1){
        const err = new CustomError('No losses found', 404);
        return next(err);
    }
    res.status(200).json(losses);
});
//create a loss
const CreateLoss = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    const { price, reason } = req.body;
    //get current date
    const currentDateTime = moment.getCurrentDateTime(); // Ensures UTC+1
    // Validate required fields
    if (!store || !mongoose.Types.ObjectId.isValid(store) || !price || !reason) {
        return next(new CustomError('All fields are required', 400));
    }
    //check if price is a number
    if(!validator.isNumeric(price.toString()) || Number(price) < 0){
        return next(new CustomError('Price must be a positive number', 400));
    }

    //create a new loss
    const newLoss = await Losses.create({
        store,
        price,
        reason: reason.toString(),
        date: currentDateTime
    });
    //check if loss was created
    if(!newLoss){
        const err = new CustomError('Error while creating loss, try again.', 400);
        return next(err);
    }

    res.status(200).json({message: 'Loss created successfully'});
});
//update a loss
const UpdateLoss = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { store, price, reason } = req.body;
    // Validate required fields
    if (!store || !mongoose.Types.ObjectId.isValid(store) || 
        !id || !mongoose.Types.ObjectId.isValid(id)
    ) {
        return next(new CustomError('All fields are required', 400));
    }
    //validate optional fields
    if(!price && !reason){
        return next(new CustomError('At least one field is required', 400));
    }
    //check if price is a number
    if(price && !validator.isNumeric(price) || price < 0){
        return next(new CustomError('Price must be a positive number', 400));
    }
    //check if reason is a string
    if(reason && !validator.isString(reason)){
        return next(new CustomError('Reason must be a string', 400));
    }
    //check if store exists
    const storeExists = await StoreService.findStoreById(store);
    if(!storeExists){
        const err = new CustomError('Store not found', 404);
        return next(err);
    }
    //check if loss exists
    const existingLoss = await LossesService.findLossesById(id);
    if(!existingLoss){
        const err = new CustomError('Loss not found', 404);
        return next(err);
    }

    //update
    if(price) existingLoss.price = price;
    if(reason) existingLoss.reason = reason;
    
    //save updated loss
    const updatedLoss = await existingLoss.save();

    //check if loss was updated
    if(!updatedLoss){
        const err = new CustomError('Error while updating loss, try again.', 400);
        return next(err);
    }

    res.status(200).json({message: 'Loss updated successfully'});
});
//delete a loss
const DeleteLoss = asyncErrorHandler(async (req, res, next) => {
    const { id, store } = req.params;
    //check if all required fields are provided
    if(!id || !mongoose.Types.ObjectId.isValid(id)
        || !store || !mongoose.Types.ObjectId.isValid(store)
    ){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }

    //check if store exists
    const storeExists = await StoreService.findStoreById(store);
    if(!storeExists){
        const err = new CustomError('Store not found', 404);
        return next(err);
    }

    //check if loss exists
    const existingLoss = await LossesService.findLossesById(id);
    if(!existingLoss){
        const err = new CustomError('Loss not found', 404);
        return next(err);
    }

    //delete loss
    const deletedLoss = await existingLoss.deleteOne();

    //check if loss was deleted
    if(!deletedLoss){
        const err = new CustomError('Error while deleting loss, try again.', 400);
        return next(err);
    }

    res.status(200).json({message: 'Loss deleted successfully'});
});
//get statistics losses for specific store
const GetStatisticsForStore = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;

    // Validate store and Client IDs
    if (!store || !mongoose.Types.ObjectId.isValid(store)) {
        return next(new CustomError('All fields are required', 400));
    }

    // Check if the store exists
    const existStore = await StoreService.findStoreById(store);
    if (!existStore) {
        return next(new CustomError('Store not found', 404));
    }


    // Get statistics for the store
    const existingLosses = await Losses.find({ store: store }).select('price');
    //check if there are no losses
    if(existingLosses.length < 1){
        return next(new CustomError('No losses found', 404));
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
    GetAllLosses,
    CreateLoss,
    UpdateLoss,
    DeleteLoss,
    GetStatisticsForStore
};