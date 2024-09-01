const mongoose = require('mongoose');
const Stock = require('../model/StockModel');
const validator = require('validator');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const StockService = require('../service/StockService.js');
const StoreService = require('../service/StoreService.js');
const ProductService = require('../service/ProductService.js');
const StockStatusService = require('../service/StockStatusService.js');
const moment = require('moment');
require('moment-timezone');

//Create a new stock
const CreateStock = asyncErrorHandler(async (req, res, next) => {
    const { Product, Store, BuyingPrice, SellingPrice, Quantity, 
        LimitedQuantity, ExparationDate, BuyingMathode, Destocking } = req.body;
    // Check if all required fields are provided
    if (!Product || !Store || !BuyingMathode ||
        !BuyingPrice || !SellingPrice || 
        !validator.isNumeric(BuyingPrice.toString()) || 
        !validator.isNumeric(SellingPrice.toString())  ||
        !mongoose.Types.ObjectId.isValid(Product) || 
        !mongoose.Types.ObjectId.isValid(Store)
    ) {
        return next(new CustomError('All fields are required', 400));
    }
    //check if Quantity is a positive number
    if(!Quantity || Number(Quantity) <= 0 || !validator.isNumeric(Quantity.toString())){
        return next(new CustomError('Quantity must be a positive number > 0', 400));
    }
    //check if BuyingPrice and SellingPrice is a positive number
    if(Number(BuyingPrice) <= 0 || Number(SellingPrice) <= 0){
        return next(new CustomError('Buying and Selling price must be a positive number > 0', 400));
    }
    //check if buying price is greater than selling price
    if(Number(BuyingPrice) >= Number(SellingPrice)){
        return next(new CustomError('Buying price must be less than or equal to selling price', 400));
    }
    //check if BuyingMathode is provided
    if(!BuyingMathode.buyingByUnit && !BuyingMathode.buyingByBox){
        return next(new CustomError('Buying Mathode is required', 400));
    }
    //check if LimitedQuantity and Destocking is valid
    if((!validator.isEmpty(LimitedQuantity.toString()) && !validator.isNumeric(LimitedQuantity.toString())) ||
        (!validator.isEmpty(Destocking.toString()) && !validator.isNumeric(Destocking.toString()))
    ){
        return next(new CustomError('Limited Quantity and Destocking must be a number', 400));
    }
    //check if ExparationDate is valid
    if(ExparationDate && !validator.isDate(ExparationDate)){
        return next(new CustomError('Exparation Date must be a date', 400));
    }

    //get current datetime
    const currentDateTime = moment.tz('Africa/Algiers').format();

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        // Check if product already exists
        const product = await ProductService.findProductById(Product, session);
        if (!product) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Product not found', 404));
        }

        // Check if store already exists
        const store = await StoreService.findStoreById(Store, session);
        if (!store) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Store not found', 404));
        }

        // recalculate the quantity 
        const newQuantity = Number(Quantity) * Number(product.boxItems);
        // Check if stock already exists
        const stock = await StockService.findStockByStoreAndProduct(Store, Product, session);
        if (stock) {
            // Add new stock status
            const stockStatus = await StockStatusService.createStockStatus(
                currentDateTime,
                stock._id,
                BuyingPrice,
                SellingPrice,
                newQuantity,
                ExparationDate,
                session
            );

            if (!stockStatus) {
                await session.abortTransaction();
                session.endSession();
                return next(new CustomError('Error while creating stock status, try again.', 400));
            }
            //
            const buyingMathode = BuyingMathode.buyingByUnit && BuyingMathode.buyingByBox 
            ? 'both' 
            : (BuyingMathode.buyingByUnit 
                ? 'unity' 
                : (BuyingMathode.buyingByBox ? 'box' : null)
            );

            stock.buying = Number(BuyingPrice);
            stock.selling = Number(SellingPrice);
            stock.quantityLimit = Number(LimitedQuantity) > 0 ? Number(LimitedQuantity) : 0;
            stock.destocking = Number(Destocking) > 0 ? Number(Destocking) : 0;
            stock.buyingMathode = buyingMathode;
            stock.quantity += Number(newQuantity);
            await stock.save({ session });

            await session.commitTransaction();
            session.endSession();
            return res.status(200).json({ message: 'Stock already exists, new stock status added successfully' });
        }else{
            //check if Quantity is greater than LimitedQuantity
            if(Number(LimitedQuantity) > 0 && Number(newQuantity) < Number(LimitedQuantity)){
                await session.abortTransaction();
                session.endSession();
                return next(new CustomError('Unity quantity must be greater than or equal to Limited Quantity', 400));
            }
            //check if Quantity is greater than Destocking
            if(Number(Destocking) > 0 && Number(newQuantity) < Number(Destocking)){
                await session.abortTransaction();
                session.endSession();
                return next(new CustomError('Unity quantity must be greater than or equal to Destocking Quantity', 400));
            }

            const buyingMathode = BuyingMathode.buyingByUnit && BuyingMathode.buyingByBox 
            ? 'both' 
            : (BuyingMathode.buyingByUnit 
                ? 'unity' 
                : (BuyingMathode.buyingByBox ? 'box' : null)
            );

            // Create a new stock
            const newStock = await Stock.create([{
                product: Product,
                store: Store,
                quantity: Number(newQuantity),
                buying: BuyingPrice,
                selling: SellingPrice,
                quantityLimit: Number(LimitedQuantity) > 0 ? Number(LimitedQuantity) : 0,
                destocking: Number(Destocking) > 0 ? Number(Destocking) : 0,
                buyingMathode: buyingMathode,
            }], { session });
            if (!newStock) {
                await session.abortTransaction();
                session.endSession();
                return next(new CustomError('Error while creating stock, try again.', 400));
            }

            // Create a new stock status
            const stockStatus = await StockStatusService.createStockStatus(
                currentDateTime,
                newStock[0]._id,
                BuyingPrice,
                SellingPrice,
                newQuantity,
                ExparationDate,
                session
            );
            if (!stockStatus) {
                await session.abortTransaction();
                session.endSession();
                return next(new CustomError('Error while creating stock status, try again.', 400));
            }

            await session.commitTransaction();
            session.endSession();

            res.status(200).json({ message: 'Stock created successfully' });
        }
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.log(error);
        next(new CustomError('Error while creating stock, try again.', 400));
    }
});
//fetch stock by id
const FetchStockByID = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    //check if id is valid
    if(!mongoose.Types.ObjectId.isValid(id)){
        const err = new CustomError('Invalid stock id', 400);
        return next(err);
    }
    //check if stock already exist
    const stock = await Stock.findById(id).populate(
        {
            path:'product',
            select: '_id code name size boxItems image brand category',
            populate: [
                {
                    path: 'brand',
                    select: 'name'
                },
                {
                    path: 'category',
                    select: 'name'
                }
            ]
        }
    );
    if(!stock){
        const err = new CustomError('Stock not found', 404);
        return next(err);
    }
    res.status(200).json(stock);
});
//fetch all stock by store
const FetchStockByStore = asyncErrorHandler(async (req, res, next) => {
    const { Store } = req.params;
    //check if store already exist
    const store = await StoreService.findStoreById(Store);
    if(!store){
        const err = new CustomError('Store not found', 404);
        return next(err);
    }
    //fetch all stock by store
    const stocks = await Stock.find({
        store: Store
    }).populate({
        path:'product',
        select: '_id code name size image brand boxItems',
        populate: {
            path: 'brand',
            select: 'name'
        }
    });
    if(!stocks){
        const err = new CustomError('No stock found', 404);
        return next(err);
    }
    res.status(200).json(stocks);
});
//update stock
const UpdateStock = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { BuyingPrice, SellingPrice, Quantity } = req.body;
    // check if one required fields are provided
    if((!BuyingPrice && !SellingPrice) && !Quantity){
        const err = new CustomError('Price or Quantity is required to update', 400);
        return next(err);
    }
    // check if price is provided
    if((BuyingPrice && !SellingPrice) || (!BuyingPrice && SellingPrice)){
        const err = new CustomError('Buying and Selling price is required to update', 400);
        return next(err);
    }
    //check if stock already exist
    const stock = await StockService.findStockById(id);
    if(!stock){
        const err = new CustomError('Stock not found', 404);
        return next(err);
    }
    //update stock
    if(Quantity) stock.quantity = Quantity;
    if(BuyingPrice) stock.buying = BuyingPrice;
    if(SellingPrice) stock.selling = SellingPrice;
    //save updated stock
    const updatedStock = await stock.save();
    if(!updatedStock){
        const err = new CustomError('Error while updating stock try again.', 400);
        return next(err);
    }
    res.status(200).json({message: 'Stock updated successfully'});
});
//update stock quantity limitation
const UpdateStockQuantityLimitation = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { QuantityLimit } = req.body;
    // check if QuantityLimit is provided
    if(validator.isEmpty(QuantityLimit.toString()) ||
        !mongoose.Types.ObjectId.isValid(id) || 
        !validator.isNumeric(QuantityLimit.toString())
    ){
        const err = new CustomError('Quantity Limit is required to update', 400);
        return next(err);
    }
    //check if stock already exist
    const stock = await StockService.findStockById(id);
    if(!stock){
        const err = new CustomError('Stock not found', 404);
        return next(err);
    }
    //update stock
    stock.quantityLimit = QuantityLimit;
    //save updated stock
    const updatedStock = await stock.save();
    if(!updatedStock){
        const err = new CustomError('Error while updating stock try again.', 400);
        return next(err);
    }
    res.status(200).json({message: 'Stock updated successfully'});
});
//delete stock
const DeleteStock = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    //check if stock already exist
    const stock = await StockService.findStockById(id);
    if(!stock){
        const err = new CustomError('Stock not found', 404);
        return next(err);
    }
    //delete stock
    const deletedStock = await Stock.deleteOne({_id: id});
    if(!deletedStock){
        const err = new CustomError('Error while deleting stock try again.', 400);
        return next(err);
    }
    res.status(200).json({message: 'Stock deleted successfully'});
});

module.exports = {
    CreateStock,
    FetchStockByID,
    FetchStockByStore,
    UpdateStock,
    UpdateStockQuantityLimitation,
    DeleteStock,
}