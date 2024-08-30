const mongoose = require('mongoose');
const StockStatus = require('../model/StockStatusModel.js');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const StockService = require('../service/StockService.js');
const StockStatusService = require('../service/StockStatusService.js');

//fetch stock status by stock
const FetchLiveStockStatusByStock = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    //validate required fields
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return next(new CustomError('Invalid stock id', 400));
    }
    //check if stock already exist
    const stock = await StockService.findStockById(id);
    if(!stock){
        const err = new CustomError('Stock not found', 404);
        return next(err);
    }
    const stockStatus = await StockStatus.findOne({ stock: id });
    if (!stockStatus || stockStatus.status.length < 1) {
        return next(new CustomError('Stock status not found', 404));
    }
    // Filter the stock status data by end == false
    const NonEndedStatus = stockStatus.status.filter(status => status.end === false);
    //check if there is any stock status
    if(NonEndedStatus.length < 1){
        return next(new CustomError('Stock status not found', 404));
    }
    res.status(200).json(NonEndedStatus);
});
const FetchEndedStockStatusByStock = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    //validate required fields
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return next(new CustomError('Invalid stock id', 400));
    }
    //check if stock already exist
    const stock = await StockService.findStockById(id);
    if(!stock){
        const err = new CustomError('Stock not found', 404);
        return next(err);
    }
    const stockStatus = await StockStatus.findOne({ stock: id });
    if (!stockStatus) {
        return next(new CustomError('Stock status not found', 404));
    }
    // Filter the stock status data by end == true
    const EndedStatus = stockStatus.status.filter(status => status.end === true);
    //check if there is any stock status
    if(EndedStatus.length < 1){
        return next(new CustomError('Stock status not found', 404));
    }
    res.status(200).json(EndedStatus);
});
//update status information of stock
const UpdateStockStatus = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { StatusID, BuyingPrice, SellingPrice, Quantity, ExparationDate } = req.body;

    // Validate required fields
    if (!StatusID || !mongoose.Types.ObjectId.isValid(StatusID) || !mongoose.Types.ObjectId.isValid(id)) {
        return next(new CustomError('Status and valid IDs are required to update', 400));
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        // Check if stock status exists
        const stockStatus = await StockStatusService.findStockStatusById(id, session);
        if (!stockStatus) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Stock status not found', 404));
        }
        const status = stockStatus.status.find(s => s._id.toString() == StatusID);
        if (!status) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Status not found', 404));
        }
        // Update stock status
        if (BuyingPrice) status.buying = BuyingPrice;
        if (SellingPrice) status.selling = SellingPrice;
        if (Quantity) {
            // const diff = Number(Quantity) - Number(status.quantity);
            // stock.quantity += diff;
            status.quantity = Number(Quantity);
        }
        if (ExparationDate) status.exparationDate = ExparationDate;

        // Save updates within the transaction
        // await stock.save({ session });
        await stockStatus.save({ session });

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: 'Stock status updated successfully' });
    } catch (error) {
        // Rollback the transaction on error
        await session.abortTransaction();
        session.endSession();
        next(new CustomError('Error while updating stock status, try again.', 400));
    }
});
//update status of stock
const UpdateStockEndStatus = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { statusID } = req.body;
    // check if status is provided
    if(!id || !mongoose.Types.ObjectId.isValid(id) || 
        !statusID || !mongoose.Types.ObjectId.isValid(statusID)
    ){
        const err = new CustomError('Status is required to update', 400);
        return next(err);
    }
    // Check if stock status exists
    const stockStatus = await StockStatusService.findStockStatusById(id);
    if (!stockStatus) {
        return next(new CustomError('Stock status not found', 404));
    }
    const status = stockStatus.status.find(s => s._id.toString() == statusID);
    //update stock status
    status.end = true;
    //save updated stock
    const updatedStock = await stockStatus.save();
    if(!updatedStock){
        const err = new CustomError('Error while updating end stock status try again.', 400);
        return next(err);
    }
    res.status(200).json({message: 'Stock finished successfully'});
});

module.exports = {
    FetchLiveStockStatusByStock,
    FetchEndedStockStatusByStock,
    UpdateStockStatus,
    UpdateStockEndStatus
};