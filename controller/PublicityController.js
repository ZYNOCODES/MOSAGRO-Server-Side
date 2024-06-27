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
    //get all Publicity by id store and where products.display is true
    const publicity = await Publicity.findOne({
        store: id,
        'products.display': true
    });
    //get stocks for
    if(!publicity){
        const err = new CustomError('No publicity found', 404);
        return next(err);
    }
    publicity.products = publicity.products.filter(product => product.display == true);
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
    //add title 
    const updatedPublicity = allProductsData.map((prod, index) => {
        return {
            ...prod.toObject(),
            title: publicity.products[index].title
        };
    });
    res.status(200).json(updatedPublicity);
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
        //check if product exist is user stock
        const foundProduct = await Stock.findOne({
            store: id,
            _id: product
        });
        if(!foundProduct){
            const err = new CustomError('Product not found in your stock', 404);
            return next(err);
        }
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
    //check if product exist is user stock
    const foundProduct = await Stock.findOne({
        store: id,
        _id: product
    });
    if(!foundProduct){
        const err = new CustomError('Product not found in your stock', 404);
        return next(err);
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
//get all publicities
const GetAllPublicPublicities = asyncErrorHandler(async (req, res, next) => {
    // Get all Publicity documents
    const publicities = await Publicity.find({});

    // Handle case where no publicities are found
    if (publicities.length === 0) {
        const err = new CustomError('No public publicity found', 404);
        return next(err);
    }

    // Filter and map publicities to include only products with display true and distination 'public'
    const filteredPublicities = await Promise.all(publicities.map(async (pub) => {
        const filteredProducts = pub.products.filter(product => 
            product.display === true && product.distination === 'public'
        );

        // Extract product IDs from filtered products
        const stockIds = filteredProducts.map(prod => prod.product);

        // Fetch all stocks for each product
        const allProductsData = await Stock.find({ 
            _id: { $in: stockIds }
        }).populate({
            path: 'product',
            select: '_id name size image'
        });
        //add title 
        const updatedPublicity = allProductsData.map((prod, index) => {
            return {
                ...prod.toObject(),
                title: filteredProducts[index].title
            };
        });

        return updatedPublicity;
    }));

    const results = filteredPublicities.filter(item => item.length >= 1);

    // Handle case where no products are found for any publicity
    if (results.length <= 0) {
        const err = new CustomError('No public publicity found', 404);
        return next(err);
    }

    res.status(200).json(results);
});
//make specific publicity public
const ChangePublicityDistination = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { product, status } = req.body;
    if (!id) {
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    //check if ids is type of mongoose id
    if(!mongoose.Types.ObjectId.isValid(id)){
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
    //make publicity public
    findedProduct.distination = status;
    const updatedPublicity = await publicity.save();
    if(!updatedPublicity){
        const err = new CustomError('Error while making publicity public', 500);
        return next(err);
    }
    res.status(200).json({ message: 'Publicity made ' + status});
});

module.exports = {
    GetAllPublicitybyStore,
    AddPublicity,
    RemovePublicity,
    GetAllPublicPublicities,
    ChangePublicityDistination
}