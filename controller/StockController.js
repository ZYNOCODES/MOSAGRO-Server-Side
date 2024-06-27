const Stock = require('../model/StockModel');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const StockService = require('../service/StockService.js');
const StoreService = require('../service/StoreService.js');
const ProductService = require('../service/ProductService.js');

//Create a new stock
const CreateStock = asyncErrorHandler(async (req, res, next) => {
    const { Product, Store, Price, Quantity } = req.body;
    // check if all required fields are provided
    if(!Product || !Store || !Price || !Quantity){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    //check if product already exist
    const product = await ProductService.findProductById(Product);
    if(!product){
        const err = new CustomError('Product not found', 404);
        return next(err);
    }
    //check if store already exist
    const store = await StoreService.findStoreById(Store);
    if(!store){
        const err = new CustomError('Store not found', 404);
        return next(err);
    }
    //check if stock is already exist
    const stock = await StockService.findStockByStoreAndProduct(Store, Product);
    if(stock){
        const err = new CustomError('Stock already exist', 400);
        return next(err);
    }
    //create a new stock
    const newStock = await Stock.create({
        product : Product,
        store : Store,
        quantity : Quantity,
        price : [Price]
    });
    
    //check if stock created successfully
    if(!newStock){
        const err = new CustomError('Error while creating stock try again.', 400);
        return next(err);
    }
    res.status(200).json({message: 'Stock created successfully'});
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
        select: '_id name size image'
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
    const { Price, Quantity } = req.body;
    // check if one required fields are provided
    if(!Price && !Quantity){
        const err = new CustomError('Price or Quantity is required to update', 400);
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
    if(Price) {
        const price = stock.price.find((p) => p === Price);
        if(price){
            //place that price at the en of the array
            const index = stock.price.indexOf(Price);
            if (index !== -1) {
                const removedPrice = stock.price.splice(index, 1)[0]; 
                stock.price.push(removedPrice);
            }
        }else{
            stock.price.push(Price);
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