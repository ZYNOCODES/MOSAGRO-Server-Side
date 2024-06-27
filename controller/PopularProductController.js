const PopularProduct = require('../model/PopularProductModel');
const Stock = require('../model/StockModel');
const Product = require('../model/ProductModel');
const mongoose = require('mongoose');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const path = require('path');

//fetch all PopularProduct
const GetAllPopularProductbyStore = asyncErrorHandler(async (req, res, next) => {
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
    //get all PopularProduct by id user
    const popularProduct = await PopularProduct.findOne({ store: id });
    //get stocks for
    if(!popularProduct){
        const err = new CustomError('No popular product found', 404);
        return next(err);
    }
    //get all stocks for each store
    const allProductsData = await Stock.find({ 
        _id: { $in: popularProduct.products }
    }).populate({
        path:'product',
        select: '_id name size image'
    });
    if(allProductsData.length <= 0){
        const err = new CustomError('No popular product found', 404);
        return next(err);
    }
    res.status(200).json(allProductsData);
});
//add PopularProduct
const AddPopularProduct = asyncErrorHandler(async (req, res, next) => {
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
    //get all popularProduct by id user
    const popularProduct = await PopularProduct.findOne({ store: id });
    if(popularProduct){
        //check if product exist is user stock
        const foundProduct = await Stock.findOne({
            store: id,
            _id: product
        });
        if(!foundProduct){
            const err = new CustomError('Product not found in your stock', 404);
            return next(err);
        }
        //check if product is already in popularProduct
        if(popularProduct.products.includes(product)){
            const err = new CustomError('Product already in popular product list', 400);
            return next(err);
        }
        //add product to popularProduct
        popularProduct.products.push(product);
        const updatedpopularProduct = await popularProduct.save();
        if(!updatedpopularProduct){
            const err = new CustomError('Error while adding product to popular product list', 500);
            return next(err);
        }
        return res.status(200).json({ message: 'Product added to popular product list'});
    }
    //check if product exist is user stock
    const foundProduct = await Stock.findOne({
        store: id,
        _id: product
    });
    if(!foundProduct){
        const err = new CustomError('Product not found in your stock', 404);
        return next(err);
    }
    //create new popularProduct
    const newpopularProduct = await PopularProduct.create({
        store: id,
        products: [product]
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
    //get all popularProduct by id store
    const popularProduct = await PopularProduct.findOne({ store: id });
    if(!popularProduct){
        const err = new CustomError('No popular product found', 404);
        return next(err);
    }
    //check if product is already in popularProduct
    if(!popularProduct.products.includes(product)){
        const err = new CustomError('Product not in popular product list', 400);
        return next(err);
    }
    //remove product from popularProduct
    popularProduct.products = popularProduct.products.filter((item) => item != product);
    const updatedPopularProduct = await popularProduct.save();
    if(!updatedPopularProduct){
        const err = new CustomError('Error while removing product from popular product', 500);
        return next(err);
    }
    res.status(200).json({ message: 'Product removed from popular product list' });
});

module.exports = {
    GetAllPopularProductbyStore,
    AddPopularProduct,
    RemovePopularProduct
}