const Favorite = require('../model/FavoriteModel');
const Stock = require('../model/StockModel');
const Product = require('../model/ProductModel');
const mongoose = require('mongoose');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const path = require('path');

//fetch all Favorite
const GetAllFavoritebyUser = asyncErrorHandler(async (req, res, next) => {
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
    const favorite = await Favorite.findOne({ user: id });
    //get stocks for
    if(!favorite){
        const err = new CustomError('No favorite store found for you', 404);
        return next(err);
    }
    //get all stocks for each store
    const allProductsData = await Stock.find({ 
        _id: { $in: favorite.products }
    }).populate({
        path:'product',
        select: '_id name size image'
    });
    if(allProductsData.length <= 0){
        const err = new CustomError('No favorite store found for you', 404);
        return next(err);
    }
    res.status(200).json(allProductsData);
});
//add favorite
const AddFavorite = asyncErrorHandler(async (req, res, next) => {
    const { id, product } = req.body;
    if (!id || !product) {
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    //check if ids is type of mongoose id
    if(!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(product)){
        const err = new CustomError('Invalid id', 404);
        return next(err);
    }
    //get all Favorite by id user
    const favorite = await Favorite.findOne({ user: id });
    if(favorite){
        //check if product is already in favorite
        if(favorite.products.includes(product)){
            const err = new CustomError('Product already in favorite', 400);
            return next(err);
        }
        //add product to favorite
        favorite.products.push(product);
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
        products: [product]
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
    const { product } = req.body;
    if (!id || !product) {
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    //check if ids is type of mongoose id
    if(!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(product)){
        const err = new CustomError('Invalid id', 404);
        return next(err);
    }
    //get all Favorite by id user
    const favorite = await Favorite.findOne({ user: id });
    if(!favorite){
        const err = new CustomError('No favorite product found for you', 404);
        return next(err);
    }
    //check if product is already in favorite
    if(!favorite.products.includes(product)){
        const err = new CustomError('Product not in favorite', 400);
        return next(err);
    }
    //remove product from favorite
    favorite.products = favorite.products.filter((item) => item != product);
    const updatedFavorite = await favorite.save();
    if(!updatedFavorite){
        const err = new CustomError('Error while removing product from favorite', 500);
        return next(err);
    }
    res.status(200).json({ message: 'Product removed from favorite'});
});
module.exports = {
    GetAllFavoritebyUser,
    AddFavorite,
    RemoveFavorite
}