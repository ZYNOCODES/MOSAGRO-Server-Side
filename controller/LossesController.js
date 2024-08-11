const mongoose = require('mongoose');
const Losses = require('../model/LossesModel');
const CustomError = require('../util/CustomError.js');
const { findStockByID_IDStore } = require('../service/StockService.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const moment = require('moment');
require('moment-timezone');

//fetch all losses
const GetAllLosses = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    //check if all required fields are provided
    if(!id || !mongoose.Types.ObjectId.isValid(id)){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    //get all losses by store id
    const losses = await Losses.find({
        store: id
    }).populate({
        path: 'stock.product',
        select: 'name size image'
    });
    //check if there are no losses
    if(losses.length < 1){
        const err = new CustomError('No losses found', 404);
        return next(err);
    }
    res.status(200).json(losses);
});
//create a loss
const CreateLoss = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    const { stock, quantity, price, reason } = req.body;
    //get current date
    const currentDateTime = moment.tz('Africa/Algiers').format();
    // Validate required fields
    if (!store || !mongoose.Types.ObjectId.isValid(store) || !price || !reason) {
        return next(new CustomError('All fields are required', 400));
    }

    //check if stock exist
    if(stock){
        if (!mongoose.Types.ObjectId.isValid(stock)) {
            return next(new CustomError('Invalid stock ID', 400));
        }
        if (!quantity || !validator.isNumeric(quantity.toString())) {
            return next(new CustomError('Quantity is required and must be a valid number', 400));
        }
        const existStock = await findStockByID_IDStore(stock, store);
        if(!existStock){
            const err = new CustomError('Stock not found', 404);
            return next(err);
        }
    }
    //create a new loss
    const newLoss = await Losses.create({
        store,
        stock: stock || undefined,
        quantity: stock ? quantity : undefined,
        price,
        reason,
        date: currentDateTime
    });
    //check if loss was created
    if(!newLoss){
        const err = new CustomError('Error while creating loss, try again.', 400);
        return next(err);
    }
    res.status(200).json(newLoss);
});
//delete a loss
const DeleteLoss = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    //check if all required fields are provided
    if(!id || !mongoose.Types.ObjectId.isValid(id)){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    //delete a loss
    const loss = await Losses.findByIdAndDelete(id);
    //check if loss was deleted
    if(!loss){
        const err = new CustomError('Error while deleting loss, try again.', 400);
        return next(err);
    }
    res.status(200).json({message: 'Loss deleted successfully'});
});

module.exports = {
    GetAllLosses,
    CreateLoss,
    DeleteLoss
};