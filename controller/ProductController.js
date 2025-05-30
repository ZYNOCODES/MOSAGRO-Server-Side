const mongoose = require('mongoose');
const Product = require('../model/ProductModel');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const BrandService = require('../service/BrandService.js');
const ProductService = require('../service/ProductService.js');
const StockService = require('../service/StockService.js');
const CategoryService = require('../service/CategoryService.js');
const StoreService = require('../service/StoreService.js');
const fs = require('fs');
const path = require('path');

//create a new product
const CreateProduct = asyncErrorHandler(async (req, res, next) => {
    const { Name, Size, Brand, BoxItems, Category } = req.body;
    // check if all required fields are provided
    if(!Name || !Size || !Brand || !BoxItems || !Category ||
        !mongoose.Types.ObjectId.isValid(Brand) ||
        !mongoose.Types.ObjectId.isValid(Category)
    ){
        const err = new CustomError('Tous les champs sont obligatoires', 400);
        return next(err);
    }
    //check if image is provided
    if(!req.file || req.file == undefined){
        const err = new CustomError('L\'image est requise', 400);
        return next(err);
    }
    const filename = req.file.filename;

    //check if brand already exists
    const brand = await BrandService.findBrandById(Brand);
    if(!brand){
        const err = new CustomError('Marque non trouvée', 400);
        return next(err);
    }
    //check if brand already exists
    const category = await CategoryService.findCategoryById(Category);
    if(!category){
        const err = new CustomError('Catégorie non trouvée', 400);
        return next(err);
    }
    //check if product already exists
    const existingProduct = await ProductService.findProfuctByNameSizeBrand(Name, Size,Brand);
    if(existingProduct){
        const err = new CustomError('Le produit existe déjà', 400);
        return next(err);
    }

    //create a new product
    const newProduct = await Product.create({
        name : Name,
        size : Size,
        brand : Brand,
        category: Category,
        image : filename,
        boxItems : BoxItems
    });
    
    //check if product created successfully
    if(!newProduct){
        const err = new CustomError('Erreur lors de la création du produit, réessayez.', 400);
        return next(err);
    }
    res.status(200).json({message: 'Produit créé avec succès'});
});
//fetch all products
const GetAllProducts = asyncErrorHandler(async (req, res, next) => {
    const products = await Product.find({}).populate([
        {
            path: 'brand',
            select: 'name'
        },
        {
            path: 'category',
            select: 'name'
        }
    ]);
    if(!products || products.length < 1){
        const err = new CustomError('Aucun produit trouvé', 400);
        return next(err);
    }
    res.status(200).json(products);
});
//fetch all products by category
const GetAllProductsByCategoryStore = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    // check if all required fields are provided
    if(!id || !mongoose.Types.ObjectId.isValid(id)){
        const err = new CustomError('Tous les champs sont obligatoires', 400);
        return next(err);
    }

    //check if the store exist
    const existStore = await StoreService.findStoreById(id);
    if(!existStore){
        const err = new CustomError('Magasin non trouvé', 400);
        return next(err);
    }
    //fetch all products by store.categories
    const products = await Product.find({
        category: { $in: existStore.categories }
    }).populate([
        {
            path: 'brand',
            select: 'name'
        },
        {
            path: 'category',
            select: 'name'
        }
    ]);

    if(!products || products.length < 1){
        const err = new CustomError('Erreur lors de la récupération des produits', 400);
        return next(err);
    }
    res.status(200).json(products);
});
//fetch specific product with code
const GetProduct = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const product = await Product.findById(id).populate('brand');
    if(!product){
        const err = new CustomError('Produit non trouvé', 400);
        return next(err);
    }
    res.status(200).json(product);
});
//update a product
const UpdateProduct = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { Name, Size, Brand, BoxItems, Category } = req.body;
    // Check if id is provided
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        const err = new CustomError('L\'ID du produit est requis', 400);
        return next(err);
    }
    // Check if at least one field is provided
    if (!Name && !Size && !Brand && !BoxItems && !Category && (!req.file || req.file == undefined)) {
        const err = new CustomError('Au moins un des champs est obligatoire', 400);
        return next(err);
    }

    // Check if Product exists
    const product = await ProductService.findProductById(id);
    if (!product) {
        const err = new CustomError('Produit non trouvé', 400);
        return next(err);
    }

    // Prepare update fields
    const updateFields = {};
    if (Name) updateFields.name = Name;
    if (Size) updateFields.size = Size;
    if (BoxItems) updateFields.boxItems = BoxItems;
    if (Brand) {
        // Check if Brand exists
        const brand = await BrandService.findBrandById(Brand);
        if (!brand) {
            const err = new CustomError('Marque non trouvée', 400);
            return next(err);
        }
        updateFields.brand = Brand;
    }
    if (Category) {
        // Check if Category exists
        const category = await CategoryService.findCategoryById(Category);
        if (!category) {
            const err = new CustomError('Catégorie non trouvée', 400);
            return next(err);
        }
        updateFields.category = Category;
    }
    if (req.file && req.file != undefined) {
        updateFields.image = req.file.filename
    }
    
    // Update Product
    const updatedProduct = await Product.updateOne({ _id: product._id }, { $set: updateFields });

    // Check if Product updated successfully
    if (!updatedProduct) {
        const err = new CustomError('Erreur lors de la mise à jour du produit, réessayez.', 400);
        return next(err);
    }
    
    // Delete the image file from the server
    if(product.image && req.file && req.file != undefined){
        const imagePath = path.join(__dirname, '..', 'files', product.image);
        fs.access(imagePath, fs.constants.F_OK, (err) => {
            if (err) {
                console.log('Image not found or already deleted:', err);
            } else {
                fs.unlink(imagePath, (unlinkErr) => {
                    if (unlinkErr) {
                        console.log('Error deleting image:', unlinkErr);
                    }
                });
            }
        });
    }

    res.status(200).json({ message: 'Produit mis à jour avec succès' });
});
//delete a product
const DeleteProduct = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    // Check if id is provided
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        const err = new CustomError('L\'ID du produit est requis', 400);
        return next(err);
    }
    const product = await Product.findOne({_id: id});
    if(!product){
        const err = new CustomError('Produit non trouvé', 404);
        return next(err);
    }
    //check if product is used in any stock
    const existStock = await StockService.findStockByProduct(id);
    if(existStock){
        const err = new CustomError('Le produit est utilisé dans certains magasins', 400);
        return next(err);
    }
    const deletedProduct = await Product.deleteOne({_id: product._id});
    if(!deletedProduct){
        const err = new CustomError('Erreur lors de la suppression du produit', 400);
        return next(err);
    }

    // Delete the image file from the server
    if(product.image){
        const imagePath = path.join(__dirname, '..', 'files', product.image);
        fs.access(imagePath, fs.constants.F_OK, (err) => {
            if (err) {
                console.log('Image not found or already deleted:', err);
            } else {
                fs.unlink(imagePath, (unlinkErr) => {
                    if (unlinkErr) {
                        console.log('Error deleting image:', unlinkErr);
                    }
                });
            }
        });
    }

    res.status(200).json({message: 'Produit supprimé avec succès'});
});

module.exports = {
    CreateProduct,
    GetAllProducts,
    GetAllProductsByCategoryStore,
    GetProduct,
    UpdateProduct,
    DeleteProduct
}