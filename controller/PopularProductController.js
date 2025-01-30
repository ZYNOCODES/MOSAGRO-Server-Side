const PopularProduct = require('../model/PopularProductModel');
const Stock = require('../model/StockModel');
const mongoose = require('mongoose');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const FavoriteService = require('../service/FavoriteService.js');

//fetch all PopularProduct
const GetAllPopularProductbyStore = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    if (!store || !mongoose.Types.ObjectId.isValid(store)) {
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    //get all PopularProduct by id user
    const popularProduct = await PopularProduct.find({ 
        store: store
    }).populate({
        path: 'stock',
        select: '_id product buying selling quantity buyingMathode quantityLimit destocking',
        populate: {
            path:'product',
            select: '_id code name size image brand boxItems',
            populate: {
                path: 'brand',
                select: 'name'
            }
        }
    });
    //check if popularProduct exist
    if(!popularProduct || popularProduct.length <= 0){
        const err = new CustomError('No popular product found', 404);
        return next(err);
    }

    res.status(200).json(popularProduct);
});
//fetch all PopularProduct
const GetAllPopularProductbyStoreForClient = asyncErrorHandler(async (req, res, next) => {
    const { client, store } = req.params;
    if (!store || !mongoose.Types.ObjectId.isValid(store) ||
        !client || !mongoose.Types.ObjectId.isValid(client)
    ) {
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    //get all PopularProduct by id user
    const popularProduct = await PopularProduct.find({ 
        store: store
    }).populate({
        path: 'stock',
        select: '_id product buying selling quantity buyingMathode quantityLimit destocking',
        populate: {
            path:'product',
            select: '_id code name size image brand boxItems',
            populate: {
                path: 'brand',
                select: 'name'
            }
        }
    });
    //check if popularProduct exist
    if(!popularProduct || popularProduct.length <= 0){
        const err = new CustomError('No popular product found', 404);
        return next(err);
    }
    //check every stock if is a favorite stock by client
    const updatedStocks = await Promise.all(
        popularProduct.map(async (item) => {
            const isFavorite = await FavoriteService.checkProductInFavorite(
                client,
                store,
                item.stock._id
            );
            return {
                ...item.toObject(),
                stock: {
                    ...item.stock.toObject(),
                    isFavorite: isFavorite,
                },
            };
        })
    );
    if(!updatedStocks || updatedStocks.length <= 0){
        const err = new CustomError('Error while checking favorite product', 500);
        return next(err);
    }
    res.status(200).json(updatedStocks);
});
//add PopularProduct
const AddPopularProduct = asyncErrorHandler(async (req, res, next) => {
    const { id, stock } = req.body;
    if (!id || !stock ||
        !mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(stock)
    ) {
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    //check if stock exist is user stock
    const foundProduct = await Stock.findOne({
        store: id,
        _id: stock
    });
    if(!foundProduct){
        const err = new CustomError('Product not found in your stock', 404);
        return next(err);
    }
    //check if popularProduct exist
    const popularProduct = await PopularProduct.findOne({
        store: id,
        stock: stock
    });
    if(popularProduct){
        const err = new CustomError('Product already in popular product list', 400);
        return next(err);
    }
    //create new popularProduct
    const newpopularProduct = await PopularProduct.create({
        store: id,
        stock: stock
    });
    if(!newpopularProduct){
        const err = new CustomError('Error while creating popular product', 500);
        return next(err);
    }
    res.status(200).json({ message: 'Product added to popular product list'});
});
//remove PopularProduct
const RemovePopularProduct = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { stock } = req.body;
    if (!id || !stock ||
        !mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(stock)
    ) {
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    //check if popularProduct exist
    const foundProduct = await PopularProduct.findOne({
        store: id,
        stock: stock
    });
    if(!foundProduct){
        const err = new CustomError('Product not found in popular product list', 404);
        return next(err);
    }
    //delete popularProduct
    const deletedPopularProduct = await PopularProduct.findByIdAndDelete(foundProduct._id);
    if(!deletedPopularProduct){
        const err = new CustomError('Error while deleting popular product', 500);
        return next(err);
    }

    res.status(200).json({ message: 'Product removed from popular product list' });
});

module.exports = {
    GetAllPopularProductbyStore,
    GetAllPopularProductbyStoreForClient,
    AddPopularProduct,
    RemovePopularProduct
}