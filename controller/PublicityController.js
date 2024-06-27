const Publicity = require('../model/PublicityModel');
const Stock = require('../model/StockModel');
const Product = require('../model/ProductModel');
const mongoose = require('mongoose');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const path = require('path');

//fetch all Publicity
const GetAllPublicitybyStore = asyncErrorHandler(async (req, res, next) => {
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
    //get all Publicity by id user
    const publicity = await Publicity.findOne({ store: id });
    //get stocks for
    if(!publicity){
        const err = new CustomError('No publicity found', 404);
        return next(err);
    }
    // Extract product IDs from publicity.products array
    const stockIds = publicity.products.map(prod => prod.product);
    //get all stocks for each product
    const allProductsData = await Stock.find({ 
        _id: { $in: stockIds }
    }).populate({
        path:'product',
        select: '_id name size image'
    });
    if(allProductsData.length <= 0){
        const err = new CustomError('No product found in publicity', 404);
        return next(err);
    }
    res.status(200).json(allProductsData);
});
//add Publicity
const AddPublicity = asyncErrorHandler(async (req, res, next) => {
    const { id, product, title } = req.body;
    if (!id || !product) {
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    //check if ids is type of mongoose id
    if(!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(product)){
        const err = new CustomError('Invalid id', 404);
        return next(err);
    }
    //get all Publicity by id user
    const publicity = await Publicity.findOne({ store: id });
    if(publicity){
        //check if product is already in Publicity
        const findedProduct = publicity.products.find((p) => p.product == product);
        if(findedProduct){
            const err = new CustomError('Product already in publicity list', 400);
            return next(err);
        }
        //add product to Publicity
        publicity.products.push({
            title: title,
            product: product
        });
        const updatedPublicity = await publicity.save();
        if(!updatedPublicity){
            const err = new CustomError('Error while adding product to publicity list', 500);
            return next(err);
        }
        return res.status(200).json({ message: 'Product added to publicity list'});
    }
    //create new Publicity
    const newPublicity = await Publicity.create({
        store: id,
        products: [{
            title: title,
            product: product
        }]
    });
    if(!newPublicity){
        const err = new CustomError('Error while creating publicity', 500);
        return next(err);
    }
    res.status(200).json({ message: 'Product added to publicity list'});
});
//remove Publicity
const RemovePublicity = asyncErrorHandler(async (req, res, next) => {
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
    //get all Publicity by id store
    const publicity = await Publicity.findOne({ store: id });
    if(!publicity){
        const err = new CustomError('no publicity found', 404);
        return next(err);
    }
    //check if product is already in Publicity
    const findedProduct = publicity.products.find((p) => p.product == product);
    if(!findedProduct){
        const err = new CustomError('product not in publicity list', 400);
        return next(err);
    }
    //remove product from Publicity
    publicity.products = publicity.products.filter((item) => item.product != product);
    const updatedPublicity = await publicity.save();
    if(!updatedPublicity){
        const err = new CustomError('Error while removing product from publicity', 500);
        return next(err);
    }
    res.status(200).json({ message: 'Product removed from publicity list' });
});

module.exports = {
    GetAllPublicitybyStore,
    AddPublicity,
    RemovePublicity
}