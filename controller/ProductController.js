const Product = require('../model/ProductModel');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');

// Define a route for fetching all Consultations
const CreateProduct = asyncErrorHandler(async (req, res, next) => {
    const { name } = req.body;
    // check if all required fields are provided
    if(!name){
        const err = new CustomError('Tout les champs doivent etre remplis', 400);
        return next(err);
    }
    res.status(201).json({message: 'Product created successfully'});
});
const GetAllProducts = asyncErrorHandler(async (req, res, next) => {

});

module.exports = {
    CreateProduct,
    GetAllProducts
}