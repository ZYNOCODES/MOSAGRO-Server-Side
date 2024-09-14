const mongoose = require('mongoose');
const validator = require('validator');
const StockStatus = require('../model/StockStatusModel.js');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const StockService = require('../service/StockService.js');
const StockStatusService = require('../service/StockStatusService.js');
const ProductService = require('../service/ProductService.js');
const moment = require('../util/Moment.js');


//add new stockstatus to specific stock
const CreateNewStockStatusForStock = asyncErrorHandler(async (req, res, next) => {
    const { stock } = req.params;
    const { BuyingPrice, SellingPrice, Quantity, ExparationDate} = req.body;
    // Check if all required fields are provided
    if (validator.isEmpty(stock.toString()) ||
        !mongoose.Types.ObjectId.isValid(stock) ||
        validator.isEmpty(BuyingPrice.toString()) ||
        validator.isEmpty(SellingPrice.toString()) ||
        validator.isEmpty(Quantity.toString())
    ) {
        return next(new CustomError('All fields are required', 400));
    }
    //check if Quantity is a positive number
    if(!Quantity || Number(Quantity) <= 0 || !validator.isNumeric(Quantity.toString())){
        return next(new CustomError('Quantity must be a positive number > 0', 400));
    }
    //check if BuyingPrice and SellingPrice is a positive number
    if(!validator.isNumeric(BuyingPrice.toString()) || 
        !validator.isNumeric(SellingPrice.toString()) ||
        Number(BuyingPrice) <= 0 || Number(SellingPrice) <= 0
    ){
        return next(new CustomError('Buying and Selling price must be a positive number > 0', 400));
    }
    //check if buying price is greater than selling price
    if(Number(BuyingPrice) >= Number(SellingPrice)){
        return next(new CustomError('Buying price must be less than or equal to selling price', 400));
    }
    //check if ExparationDate is valid
    if(ExparationDate && !validator.isDate(ExparationDate)){
        return next(new CustomError('Exparation Date must be a date', 400));
    }

    //get current datetime
    const currentDateTime = moment.getCurrentDateTime(); // utc+1

    const session = await mongoose.startSession();
    session.startTransaction();

    try{
        // Check if store already exists
        const existingStock = await StockService.findStockById(stock);
        if (!existingStock) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Stock not found', 404));
        }

        //get product
        const product = await ProductService.findProductById(existingStock.product);
        if (!product) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Product not found', 404));
        }

        // recalculate the quantity 
        const newQuantity = Number(Quantity) * Number(product.boxItems);

        // Add new stock status
        const stockStatus = await await StockStatus.create([{
            stock: existingStock._id,
            date: currentDateTime,
            buying: BuyingPrice,
            selling: SellingPrice,
            quantity: newQuantity,
            exparationDate: ExparationDate ? ExparationDate : '',
        }], { session });

        if (!stockStatus) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Error while creating stock status, try again.', 400));
        }

        existingStock.buying = Number(BuyingPrice);
        existingStock.selling = Number(SellingPrice);
        existingStock.quantity += Number(newQuantity);

        await existingStock.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: 'New stock status added successfully' });
    }catch(err){
        await session.abortTransaction();
        session.endSession();
        console.log(err);
        next(new CustomError('Error while creating new stock status, try again.', 400));
    }

});
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

    const stockStatus = await StockStatus.find({ 
        stock: id,
    });

    if (!stockStatus || stockStatus.length < 1) {
        return next(new CustomError('Stock status not found', 404));
    }
    res.status(200).json(stockStatus);
});
//update status information of stock
const UpdateStockStatus = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { SellingPrice, Quantity, ExparationDate } = req.body;

    // Validate required fields
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return next(new CustomError('Status and valid IDs are required to update', 400));
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        // Check if stock status exists
        const stockStatus = await StockStatusService.findStockStatusById(id);
        if (!stockStatus) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Stock status not found', 404));
        }
        
        // Update stock status
        if (SellingPrice) stockStatus.selling = SellingPrice;
        if (Quantity) {
            // const diff = Number(Quantity) - Number(status.quantity);
            // stock.quantity += diff;
            stockStatus.quantity = Number(Quantity);
            //update stock quantity
        }
        if (ExparationDate) stockStatus.exparationDate = ExparationDate;

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
//delete status information of stock
const DeleteStockStatus = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;

    // Validate required fields
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return next(new CustomError('Status ID is required to delete', 400));
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        // Check if stock status exists
        const stockStatus = await StockStatusService.findStockStatusById(id);
        if (!stockStatus) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Stock status not found', 404));
        }

        // Delete stock status
        const deletedStatus = await stockStatus.remove({ session });
        if (!deletedStatus) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Error while deleting stock status, try again.', 400));
        }

        // get stock
        const stock = await StockService.findStockById(stockStatus.stock);
        if (!stock) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Stock not found', 404));
        }
        //Update stock quantity
        


        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: 'Stock status deleted successfully' });
    } catch (error) {
        // Rollback the transaction on error
        await session.abortTransaction();
        session.endSession();
        next(new CustomError('Error while deleting stock status, try again.', 400));
    }
});

module.exports = {
    CreateNewStockStatusForStock,
    FetchLiveStockStatusByStock,
    UpdateStockStatus,
    DeleteStockStatus
};