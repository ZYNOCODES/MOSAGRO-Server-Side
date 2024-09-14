const mongoose = require('mongoose');
const validator = require('validator');
const Losses = require('../model/LossesModel');
const Stock = require('../model/StockModel');
const CustomError = require('../util/CustomError.js');
const { findStockByID_IDStore } = require('../service/StockService.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const moment = require('../util/Moment.js');

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
    const currentDateTime = moment.getCurrentDateTime(); // Ensures UTC+1
    // Validate required fields
    if (!store || !mongoose.Types.ObjectId.isValid(store) || !price || !reason) {
        return next(new CustomError('All fields are required', 400));
    }
    const session = await mongoose.startSession();
    try{
        session.startTransaction();
        //check if stock exist
        let existStock = null;
        if(stock){
            if (!mongoose.Types.ObjectId.isValid(stock)) {
                return next(new CustomError('Invalid stock ID', 400));
            }
            if (!quantity || !validator.isNumeric(quantity.toString())) {
                return next(new CustomError('Quantity is required and must be a valid number', 400));
            }
            existStock = await findStockByID_IDStore(stock, store, session);
            if(!existStock){
                await session.abortTransaction();
                session.endSession();
                const err = new CustomError('Stock not found', 404);
                return next(err);
            }
            //check if quantity is greater than stock quantity
            if(quantity > existStock.quantity){
                await session.abortTransaction();
                session.endSession();
                const err = new CustomError('Quantity is greater than stock quantity', 400);
                return next(err);
            }
            //update stock quantity
            const newQuantity = existStock.quantity - quantity;
            const updatedStock = await Stock.findByIdAndUpdate(stock, {
                quantity: newQuantity
            }).session(session);
            //check if stock was updated
            if(!updatedStock){
                await session.abortTransaction();
                session.endSession();
                const err = new CustomError('Error while updating stock, try again.', 400);
                return next(err);
            }
        }
        //create a new loss
        const newLoss = await Losses.create([{
            store,
            stock: stock || undefined,
            quantity: stock ? quantity : undefined,
            price,
            reason,
            date: currentDateTime
        }], { session });
        //check if loss was created
        if(!newLoss){
            await session.abortTransaction();
            session.endSession();
            const err = new CustomError('Error while creating loss, try again.', 400);
            return next(err);
        }
        await session.commitTransaction();
        session.endSession();
        res.status(200).json(newLoss);
    }catch(err){
        await session.abortTransaction();
        session.endSession();
        console.log(err);
        return next(new CustomError('Error while creating new loss, try again', 500));
    }
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