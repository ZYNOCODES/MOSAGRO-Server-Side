const mongoose = require('mongoose');
const Stock = require('../model/StockModel');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const StockService = require('../service/StockService.js');
const StoreService = require('../service/StoreService.js');
const ProductService = require('../service/ProductService.js');

//Create a new stock
const CreateStock = asyncErrorHandler(async (req, res, next) => {
    const { Product, Store, BuyingPrice, SellingPrice, Quantity } = req.body;
    // check if all required fields are provided
    if(!Product || !Store || !BuyingPrice || !SellingPrice || !Quantity ||
        !mongoose.Types.ObjectId.isValid(Product) || !mongoose.Types.ObjectId.isValid(Store)
    ){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try{
        //check if product already exist
        const product = await ProductService.findProductById(Product, session);
        if(!product){
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Product not found', 404));
        }
        //check if store already exist
        const store = await StoreService.findStoreById(Store, session);
        if(!store){
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Store not found', 404));
        }
        //check if stock is already exist
        const stock = await StockService.findStockByStoreAndProduct(Store, Product, session);
        if(stock){
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Stock already exists', 400));

        }
        //create a new stock
        await Stock.create({
            product : Product,
            store : Store,
            quantity : Quantity,
            price : [{
                buying : BuyingPrice,
                selling : SellingPrice
            }]
        }, { session });
        
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({message: 'Stock created successfully'});
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(new CustomError('Error while creating stock, try again.', 400));
    }
    
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
        select: '_id code name size image brand',
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
    //check if price already exist
    if (BuyingPrice && SellingPrice) {
        const price = stock.price.find((p) => p.buying === BuyingPrice && p.selling === SellingPrice);
        if (price) {
            // Place that price at the end of the array
            const index = stock.price.indexOf(price);
            if (index !== -1) {
                const removedPrice = stock.price.splice(index, 1)[0]; 
                stock.price.push(removedPrice);
            }
        } else {
            stock.price.push({ buying: BuyingPrice, selling: SellingPrice });
        }
    }
    if(Quantity) stock.quantity = Quantity;
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
    FetchStockByStore,
    UpdateStock,
    DeleteStock
}