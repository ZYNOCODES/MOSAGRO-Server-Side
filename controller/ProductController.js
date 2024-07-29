const Product = require('../model/ProductModel');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const { ProductCode } = require('../util/Codification.js');
const BrandService = require('../service/BrandService.js');
const ProductService = require('../service/ProductService.js');

//create a new product
const CreateProduct = asyncErrorHandler(async (req, res, next) => {
    const { Name, Subname, Size, Brand, Image, BoxItems } = req.body;
    // check if all required fields are provided
    if(!Name || !Size || !Brand || !Image || !BoxItems){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    //check if brand already exists
    const brand = await BrandService.findBrandById(Brand);
    if(!brand){
        const err = new CustomError('Brand not found', 400);
        return next(err);
    }
    //generate codification for a product
    const code = await ProductCode(brand.code, Subname, Size);
    //check if the product already exist with that code
    if(code == null){
        const err = new CustomError('An existing product use that code. check the product list', 400);
        return next(err);
    }

    //create a new product
    const newProduct = await Product.create({
        code : code,
        name : Name,
        subName : Subname,
        size : Size,
        brand : Brand,
        image : Image,
        boxItems : BoxItems
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
    const { id } = req.params;
    const product = await Product.findById(id).populate('brand');
    if(!product){
        const err = new CustomError('Product not found', 400);
        return next(err);
    }
    res.status(200).json(product);
});
//update a product
const UpdateProduct = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { Name, Subname, Size, Brand, BoxItems } = req.body;

    // Check if at least one field is provided
    if (!Name && !Subname && !Size && !Brand && !BoxItems) {
        const err = new CustomError('One of the fields is required at least', 400);
        return next(err);
    }

    // Check if Product exists
    const product = await ProductService.findProductById(id);
    if (!product) {
        const err = new CustomError('Product not found', 400);
        return next(err);
    }

    // Prepare update fields
    const updateFields = {};
    if (Name) updateFields.name = Name;
    if (Subname) updateFields.subname = Subname;
    if (Size) updateFields.size = Size;
    if (Brand) updateFields.brand = Brand;
    if (BoxItems) updateFields.boxItems = BoxItems;
    
    // Update Product
    const updatedProduct = await Product.updateOne({ _id: id }, { $set: updateFields });

    // Check if Product updated successfully
    if (!updatedProduct) {
        const err = new CustomError('Error while updating Product, try again.', 400);
        return next(err);
    }

    res.status(200).json({ message: 'Product updated successfully' });
});
//delete a product
const DeleteProduct = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const product = await Product.findOne({_id: id});
    if(!product){
        const err = new CustomError('Product not found', 400);
        return next(err);
    }
    const deletedProduct = await Product.deleteOne({_id: id});
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