const mongoose = require('mongoose');
const Category = require('../model/CategoryModel.js');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const CategoryService = require('../service/CategoryService.js');
const StoreService = require('../service/StoreService.js');
const ProductService = require('../service/ProductService.js');

//create a new Category
const CreateCategory = asyncErrorHandler(async (req, res, next) => {
    const { Name } = req.body;
    // check if all required fields are provided
    if(!Name){
        const err = new CustomError('Tous les champs sont obligatoires', 400);
        return next(err);
    }
    //check if the code is valid
    const existCategory = await Category.findOne({
        name: { $regex: new RegExp(`^${Name}$`, 'i') }
    });
    if(existCategory){
        const err = new CustomError('Une catégorie avec ce nom existe déjà', 400);
        return next(err);
    }
    //create a new Category
    const newCategory = await Category.create({
        name : Name,
    });
    //check if Category created successfully
    if(!newCategory){
        const err = new CustomError('Erreur lors de la création de la catégorie, veuillez réessayer.', 400);
        return next(err);
    }
    res.status(200).json({message: 'Catégorie créée avec succès'});
});

//add Category to store
const AddCategoryToStore = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    const { category } = req.body;
    // check if all required fields are provided
    if(!store || !category
        || !mongoose.Types.ObjectId.isValid(store) 
        || !mongoose.Types.ObjectId.isValid(category)
    ){
        const err = new CustomError('Tous les champs sont obligatoires', 400);
        return next(err);
    }
    //check if the store exist
    const existStore = await StoreService.findStoreById(store);
    if(!existStore){
        const err = new CustomError('Magasin non trouvé', 400);
        return next(err);
    }
    //check if the category exist
    const existCategory = await CategoryService.findCategoryById(category);
    if(!existCategory){
        const err = new CustomError('Catégorie non trouvée', 400);
        return next(err);
    }

    //check if the category already exist in the store
    const exist = existStore.categories.find((cat) => cat.equals(existCategory._id));
    if(exist){
        const err = new CustomError('La catégorie existe déjà dans ce magasin', 400);
        return next(err);
    }

    //add category to store
    existStore.categories.push(existCategory._id);
    const updatedStore = await existStore.save();
    //check if category added to store successfully
    if(!updatedStore){
        const err = new CustomError('Erreur lors de l\'ajout de la catégorie au magasin, veuillez réessayer.', 400);
        return next(err);
    }
    res.status(200).json({message: 'Catégorie ajoutée au magasin avec succès'});
});

//fetch all Categorys
const GetAllCategorys = asyncErrorHandler(async (req, res, next) => {
    const Categorys = await Category.find({});
    if(!Categorys || Categorys.length < 1){
        const err = new CustomError('Aucune catégorie trouvée', 400);
        return next(err);
    }
    res.status(200).json(Categorys);
});

//fetch all Categorys
const GetAllCategorysForStore = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    // check if all required fields are provided
    if(!store || !mongoose.Types.ObjectId.isValid(store)){
        const err = new CustomError('Tous les champs sont obligatoires', 400);
        return next(err);
    }
    
    //check if the store exist
    const existStore = await StoreService.findStoreById(store);
    if(!existStore){
        const err = new CustomError('Magasin non trouvé', 400);
        return next(err);
    }
    //fetch all Categorys by store.categories
    const Categorys = await Category.find({
        _id: { $in: existStore.categories }
    });
    if(!Categorys || Categorys.length < 1){
        const err = new CustomError('Aucune catégorie trouvée', 400);
        return next(err);
    }
    res.status(200).json(Categorys);
});

//update Category
const UpdateCategoryName = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { Name } = req.body;

    // Check if at least one field is provided
    if (!Name || !id) {
        const err = new CustomError('Tous les champs sont obligatoires', 400);
        return next(err);
    }

    // Check if Category exists
    const existingCategory = await CategoryService.findCategoryById(id);
    if (!existingCategory) {
        const err = new CustomError('Catégorie non trouvée', 400);
        return next(err);
    }

    // Prepare update fields
    if (Name) existingCategory.name = Name;

    // Update Category
    const updatedCategory = await existingCategory.save();

    // Check if Category updated successfully
    if (!updatedCategory) {
        const err = new CustomError('Erreur lors de la mise à jour d\'une catégorie, veuillez réessayer.', 400);
        return next(err);
    }

    res.status(200).json({ message: 'Catégorie mise à jour avec succès' });
});

//delete Category
const DeleteCategory = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    
    // Input validation
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return next(new CustomError('ID de catégorie invalide', 400));
    }

    // Start a MongoDB session for transaction
    const session = await mongoose.startSession();
    
    try {
        // Begin transaction
        session.startTransaction();
        
        // Check if category exists
        const category = await CategoryService.findCategoryById(id);
        if (!category) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Catégorie non trouvée', 404));
        }
        
        // Check if the category is used in any product
        const productsWithCategory = await ProductService.findProductByCategory(id);
        if (productsWithCategory && productsWithCategory.length > 0) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Impossible de supprimer la catégorie, car elle est utilisée dans des produits.', 400));
        }
        
        // Delete category
        const deleteResult = await Category.deleteOne({ _id: id }, { session });
        if (deleteResult.deletedCount !== 1) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Erreur lors de la suppression de la catégorie', 500));
        }
        
        // Remove category from all stores in parallel
        const stores = await StoreService.findStoresByCategory(id, { session });
        if (stores && stores.length > 0) {
            const updatePromises = stores.map(store => {
                store.categories = store.categories.filter(cat => cat.toString() !== id);
                return store.save({ session });
            });
            
            await Promise.all(updatePromises);
        }
        
        // Commit transaction
        await session.commitTransaction();
        session.endSession();
        
        res.status(200).json({ 
            success: true,
            message: 'Catégorie supprimée avec succès'
        });
        
    } catch (error) {
        // If any error occurs, abort transaction
        await session.abortTransaction();
        session.endSession();
        
        console.error('Transaction error:', error);
        return next(new CustomError('Une erreur est survenue lors de la suppression de la catégorie', 500));
    }
});

//delete Category from store
const DeleteCategoryFromStore = asyncErrorHandler(async (req, res, next) => {
    const { store, category } = req.params;
    // check if all required fields are provided
    if(!store || !category
        || !mongoose.Types.ObjectId.isValid(store) 
        || !mongoose.Types.ObjectId.isValid(category)
    ){
        const err = new CustomError('Tous les champs sont obligatoires', 400);
        return next(err);
    }
    //check if the store exist
    const existStore = await StoreService.findStoreById(id);
    if(!existStore){
        const err = new CustomError('Magasin non trouvé', 400);
        return next(err);
    }
    //check if the category exist
    const existCategory = await CategoryService.findCategoryById(category);
    if(!existCategory){
        const err = new CustomError('Catégorie non trouvée', 400);
        return next(err);
    }

    //check if the category exist in the store
    const exist = existStore.categories.find((cat) => cat.equals(existCategory._id));
    if(!exist){
        const err = new CustomError('La catégorie n\'existe pas dans ce magasin', 400);
        return next(err);
    }

    //delete category from store
    existStore.categories = existStore.categories.filter((cat) => cat !== existCategory._id);
    const updatedStore = await existStore.save();
    //check if category deleted from store successfully
    if(!updatedStore){
        const err = new CustomError('Erreur lors de la suppression d\'une catégorie du magasin, veuillez réessayer.', 400);
        return next(err);
    }
    res.status(200).json({message: 'Catégorie supprimée du magasin avec succès'});
});

module.exports = {
    CreateCategory,
    AddCategoryToStore,
    GetAllCategorys,
    GetAllCategorysForStore,
    UpdateCategoryName,
    DeleteCategory,
    DeleteCategoryFromStore
}