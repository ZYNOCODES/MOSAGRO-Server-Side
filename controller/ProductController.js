const Product = require('../model/ProductModel');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const { ProductCode } = require('../util/Codification.js');

//create a new product
const CreateProduct = asyncErrorHandler(async (req, res, next) => {
    const { name, size, category, brand } = req.body;
    // check if all required fields are provided
    if(!name){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    //generate codification for a product
    const code = await ProductCode(category, name, size);
    //check if the product already exist with that code
    if(code = null){
        const err = new CustomError('An existing product use that code. check the product list', 400);
        return next(err);
    }

    //create a new product
    const newProduct = new Product.create({
        name : name,
        code : code,
        size : size,
        category : category,
        brand : brand
    });
    
    //check if product created successfully
    if(!newProduct){
        const err = new CustomError('Error while creating product try again.', 400);
        return next(err);
    }
    res.status(200).json({message: 'Product created successfully'});
});
//fetch all products
const GetAllProducts = asyncErrorHandler(async (req, res, next) => {
    const products = await Product.find({});
    if(!products){
        const err = new CustomError('Error while fetching products', 400);
        return next(err);
    }
    res.status(200).json(products);
});
//fetch specific product with code
const GetProduct = asyncErrorHandler(async (req, res, next) => {
    const { code } = req.params;
    const product = await Product.findOne({code: code});
    if(!product){
        const err = new CustomError('Product not found', 400);
        return next(err);
    }
    res.status(200).json(product);
});
//update a product
const UpdateProduct = asyncErrorHandler(async (req, res, next) => {
    const { code } = req.params;
    const { name } = req.body;
    const product = await Product.findOne({code: code});
    if(!product){
        const err = new CustomError('Product not found', 400);
        return next(err);
    }
    if(name) product.name = name;
    const updatedProduct = await product.save();
    if(!updatedProduct){
        const err = new CustomError('Error while updating product', 400);
        return next(err);
    }
    res.status(200).json({message: 'Product updated successfully'});
});
//delete a product
const DeleteProduct = asyncErrorHandler(async (req, res, next) => {
    const { code } = req.params;
    const product = await Product.findOne({code: code});
    if(!product){
        const err = new CustomError('Product not found', 400);
        return next(err);
    }
    const deletedProduct = await product.remove();
    if(!deletedProduct){
        const err = new CustomError('Error while deleting product', 400);
        return next(err);
    }
    res.status(200).json({message: 'Product deleted successfully'});
});

module.exports = {
    CreateProduct,
    GetAllProducts,
    GetProduct,
    UpdateProduct,
    DeleteProduct
}