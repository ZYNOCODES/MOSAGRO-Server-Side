const Favorite = require('../model/FavoriteModel');
const Stock = require('../model/StockModel');
const mongoose = require('mongoose');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const StockService = require('../service/StockService.js')

//fetch all Favorite stores by client
const GetAllFavoriteStoresbyClient = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    if (!id) {
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    //check if ids is type of mongoose id
    if(!mongoose.Types.ObjectId.isValid(id)){
        const err = new CustomError('Invalid id', 404);
        return next(err);
    }
    //get all Favorite by id user
    const favorite = await Favorite.find({ 
        user: id 
    }).select('_id store').populate({
        path: 'store',
        select: 'storeName'
    });
    //get stocks for
    if(favorite.length <= 0){
        const err = new CustomError('No favorite store found for you', 404);
        return next(err);
    }

    res.status(200).json(favorite);
});
//fetch all products by favorite
const GetFavoriteProductsById = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    if (!id) {
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    //check if ids is type of mongoose id
    if(!mongoose.Types.ObjectId.isValid(id)){
        const err = new CustomError('Invalid id', 404);
        return next(err);
    }
    //get all Favorite by id user
    const favorite = await Favorite.findOne({ 
        _id: id 
    }).select('products').populate({
        path: 'products',
        select: '_id product',
        populate: [
            {
                path:'product',
                select: '_id code name size image brand boxItems',
                populate: {
                    path: 'brand',
                    select: 'name'
                }
            }
        ]
    });
    //get stocks for
    if(!favorite || favorite.products.length <= 0){
        const err = new CustomError('No favorite store found for you', 404);
        return next(err);
    }

    res.status(200).json(favorite.products);
});
//add favorite
const AddFavorite = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { store , product } = req.body;
    if (!id || !store || !product ||
        !mongoose.Types.ObjectId.isValid(id) || 
        !mongoose.Types.ObjectId.isValid(store) || 
        !mongoose.Types.ObjectId.isValid(product)
    ) {
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    //check if product exist
    const existingStock = await StockService.findStockById(product);
    if(!existingStock){
        const err = new CustomError('Product not found', 404);
        return next(err);
    }
    //check if product is in store
    if(existingStock.store.toString() !== store.toString()){
        const err = new CustomError('Product not found in store', 404);
        return next(err);
    }
    //get all Favorite by id user
    const favorite = await Favorite.findOne({ 
        user: id,
        store: store 
    });
    if(favorite){
        //check if product is already in favorite
        if(favorite.products.includes(existingStock._id)){
            const err = new CustomError('Product already in favorite', 400);
            return next(err);
        }
        //add product to favorite
        favorite.products.push(existingStock._id);
        const updatedFavorite = await favorite.save();
        if(!updatedFavorite){
            const err = new CustomError('Error while adding product to favorite', 500);
            return next(err);
        }
        return res.status(200).json({ message: 'Product added to favorite'});
    }
    //create new favorite
    const newFavorite = await Favorite.create({
        user: id,
        store: store,
        products: [existingStock._id]
    });
    if(!newFavorite){
        const err = new CustomError('Error while creating favorite', 500);
        return next(err);
    }
    res.status(200).json({ message: 'Product added to favorite'});
});
//remove favorite
const RemoveFavorite = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { store, product } = req.body;

    // Validate input
    if (!id || !store || !product ||
        !mongoose.Types.ObjectId.isValid(id) || 
        !mongoose.Types.ObjectId.isValid(store) || 
        !mongoose.Types.ObjectId.isValid(product)
    ) {
        return next(new CustomError('All fields are required', 400));
    }

    // Check if the product exists
    const existingStock = await StockService.findStockById(product);
    if (!existingStock) {
        return next(new CustomError('Product not found', 404));
    }

    // Check if the product belongs to the specified store
    if (existingStock.store.toString() !== store.toString()) {
        return next(new CustomError('Product not found in this store', 404));
    }

    // Retrieve the user's favorite list for the store
    const favorite = await Favorite.findOne({ user: id, store });
    if (!favorite) {
        return next(new CustomError('Favorite list not found', 404));
    }

    // Check if the product is in the favorite list
    const productIndex = favorite.products.indexOf(existingStock._id.toString());
    if (productIndex === -1) {
        return next(new CustomError('Product not in your favorite list', 400));
    }

    // Remove the product from the favorite list
    favorite.products.splice(productIndex, 1);
    const oldLength = favorite.products.length;
    // Save the updated favorite list
    const updatedFavorite = await favorite.save();
    if(!updatedFavorite){
        const err = new CustomError('Error while removing product from your favorite list', 500);
        return next(err);
    }
    console.log(oldLength, updatedFavorite.products.length, favorite.products.length);
    res.status(200).json({ message: 'Product removed from your favorite list'});
});

module.exports = {
    GetAllFavoriteStoresbyClient,
    GetFavoriteProductsById,
    AddFavorite,
    RemoveFavorite
}