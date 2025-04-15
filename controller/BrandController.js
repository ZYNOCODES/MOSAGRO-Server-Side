const Brand = require('../model/BrandModel.js');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const BrandService = require('../service/BrandService.js');
const ProductService = require('../service/ProductService.js');
const fs = require('fs');
const path = require('path');

//create a new brand
const CreateBrand = asyncErrorHandler(async (req, res, next) => {
    const { Name } = req.body;
    // check if all required fields are provided
    if(!Name){
        const err = new CustomError('Tous les champs sont requis', 400);
        return next(err);
    }
    //check if image is provided
    if(!req.file || req.file == undefined){
        const err = new CustomError('L\'image est requise', 400);
        return next(err);
    }
    const filename = req.file.filename;
    //check if the Name is valid
    const existNameBrand = await Brand.findOne({
        name: Name
    });
    if(existNameBrand){
        const err = new CustomError('Le nom de la marque existe déjà', 400);
        return next(err);
    }
    //create a new brand
    const newBrand = await Brand.create({
        name : Name,
        image : filename
    });
    //check if brand created successfully
    if(!newBrand){
        const err = new CustomError('Erreur lors de la création de la marque, veuillez réessayer.', 400);
        return next(err);
    }
    res.status(200).json({message: 'Marque créée avec succès'});
});

//fetch all brands
const GetAllBrands = asyncErrorHandler(async (req, res, next) => {
    const brands = await Brand.find({});
    if(!brands || brands.length < 1){
        const err = new CustomError('Aucune marque trouvée', 404);
        return next(err);
    }
    res.status(200).json(brands);
});

//update brand
const UpdateBrandName = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { Name } = req.body;

    // Check if at least one field is provided
    if (!Name && (!req.file || req.file == undefined)) {
        const err = new CustomError('Un des champs doit être fourni', 400);
        return next(err);
    }

    // Check if brand exists
    const brand = await BrandService.findBrandById(id);
    if (!brand) {
        const err = new CustomError('Marque non trouvée', 404);
        return next(err);
    }

    // Prepare update fields
    const updateFields = {};
    if (Name) updateFields.name = Name;
    if (req.file && req.file != undefined) {
        updateFields.image = req.file.filename
    }
    // Update brand
    const updatedBrand = await Brand.updateOne({ _id: id }, { $set: updateFields });

    // Check if brand updated successfully
    if (!updatedBrand) {
        const err = new CustomError('Erreur lors de la mise à jour de la marque, veuillez réessayer.', 400);
        return next(err);
    }

    // Delete the image file from the server
    if(brand.image && req.file && req.file != undefined){
        const imagePath = path.join(__dirname, '..', 'files', brand.image);
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

    res.status(200).json({ message: 'Marque mise à jour avec succès' });
});

//delete brand
const DeleteBrand = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    //check if brand exist
    const brand = await BrandService.findBrandById(id);
    if(!brand){
        const err = new CustomError('Marque non trouvée', 404);
        return next(err);
    }
    //check if the brand is used in any product
    const products = await ProductService.findProductByBrand(id);
    if(products){
        const err = new CustomError('Impossible de supprimer la marque, car elle est utilisée dans des produits.', 400);
        return next(err);
    }
    //delete brand
    const deletedBrand = await Brand.deleteOne({_id: id});
    //check if brand deleted successfully
    if(!deletedBrand){
        const err = new CustomError('Erreur lors de la suppression de la marque, veuillez réessayer.', 400);
        return next(err);
    }
    
    // Delete the image file from the server
    if(brand.image){
        const imagePath = path.join(__dirname, '..', 'files', brand.image);
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

    res.status(200).json({message: 'Marque supprimée avec succès'});
});

module.exports = {
    CreateBrand,
    GetAllBrands,
    UpdateBrandName,
    DeleteBrand
}