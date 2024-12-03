const mongoose = require('mongoose');
const Category = require('../model/CategoryModel.js');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const CategoryService = require('../service/CategoryService.js');
const StoreService = require('../service/StoreService.js');


//create a new Category
const CreateCategory = asyncErrorHandler(async (req, res, next) => {
    const { Name } = req.body;
    // check if all required fields are provided
    if(!Name){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    //check if the code is valid
    const existCategory = await Category.findOne({
        name: { $regex: new RegExp(`^${Name}$`, 'i') }
    });
    if(existCategory){
        const err = new CustomError('An existing Category use that name. try again.', 400);
        return next(err);
    }
    //create a new Category
    const newCategory = await Category.create({
        name : Name,
    });
    //check if Category created successfully
    if(!newCategory){
        const err = new CustomError('Error while creating Category try again.', 400);
        return next(err);
    }
    res.status(200).json({message: 'Category created successfully'});
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
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    //check if the store exist
    const existStore = await StoreService.findStoreById(store);
    if(!existStore){
        const err = new CustomError('Store not found', 400);
        return next(err);
    }
    //check if the category exist
    const existCategory = await CategoryService.findCategoryById(category);
    if(!existCategory){
        const err = new CustomError('Category not found', 400);
        return next(err);
    }

    //check if the category already exist in the store
    const exist = existStore.categories.find((cat) => cat.equals(existCategory._id));
    if(exist){
        const err = new CustomError('Category already exist in the store', 400);
        return next(err);
    }

    //add category to store
    existStore.categories.push(existCategory._id);
    const updatedStore = await existStore.save();
    //check if category added to store successfully
    if(!updatedStore){
        const err = new CustomError('Error while adding category to store try again.', 400);
        return next(err);
    }
    res.status(200).json({message: 'Category added to store successfully'});
});

//fetch all Categorys
const GetAllCategorys = asyncErrorHandler(async (req, res, next) => {
    const Categorys = await Category.find({});
    if(!Categorys || Categorys.length < 1){
        const err = new CustomError('No category found', 400);
        return next(err);
    }
    res.status(200).json(Categorys);
});

//fetch all Categorys
const GetAllCategorysForStore = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    // check if all required fields are provided
    if(!store || !mongoose.Types.ObjectId.isValid(store)){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    
    //check if the store exist
    const existStore = await StoreService.findStoreById(store);
    if(!existStore){
        const err = new CustomError('Store not found', 400);
        return next(err);
    }
    //fetch all Categorys by store.categories
    const Categorys = await Category.find({
        _id: { $in: existStore.categories }
    });
    if(!Categorys || Categorys.length < 1){
        const err = new CustomError('No category found', 400);
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
        const err = new CustomError('All fields is required', 400);
        return next(err);
    }

    // Check if Category exists
    const existingCategory = await CategoryService.findCategoryById(id);
    if (!existingCategory) {
        const err = new CustomError('Category not found', 400);
        return next(err);
    }

    // Prepare update fields
    if (Name) existingCategory.name = Name;

    // Update Category
    const updatedCategory = await existingCategory.save();

    // Check if Category updated successfully
    if (!updatedCategory) {
        const err = new CustomError('Error while updating Category, try again.', 400);
        return next(err);
    }

    res.status(200).json({ message: 'Category updated successfully' });
});

//delete Category
const DeleteCategory = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    //check if Category exist
    const Category = await CategoryService.findCategoryById(id);
    if(!Category){
        const err = new CustomError('Category not found', 400);
        return next(err);
    }
    //delete Category
    const deletedCategory = await Category.deleteOne({_id: id});
    //check if Category deleted successfully
    if(!deletedCategory){
        const err = new CustomError('Error while deleting Category try again.', 400);
        return next(err);
    }
    res.status(200).json({message: 'Category deleted successfully'});
});

//delete Category from store
const DeleteCategoryFromStore = asyncErrorHandler(async (req, res, next) => {
    const { store, category } = req.params;
    // check if all required fields are provided
    if(!store || !category
        || !mongoose.Types.ObjectId.isValid(store) 
        || !mongoose.Types.ObjectId.isValid(category)
    ){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    //check if the store exist
    const existStore = await StoreService.findStoreById(id);
    if(!existStore){
        const err = new CustomError('Store not found', 400);
        return next(err);
    }
    //check if the category exist
    const existCategory = await CategoryService.findCategoryById(category);
    if(!existCategory){
        const err = new CustomError('Category not found', 400);
        return next(err);
    }

    //check if the category exist in the store
    const exist = existStore.categories.find((cat) => cat.equals(existCategory._id));
    if(!exist){
        const err = new CustomError('Category not found in the store', 400);
        return next(err);
    }

    //delete category from store
    existStore.categories = existStore.categories.filter((cat) => cat !== existCategory._id);
    const updatedStore = await existStore.save();
    //check if category deleted from store successfully
    if(!updatedStore){
        const err = new CustomError('Error while deleting category from store try again.', 400);
        return next(err);
    }
    res.status(200).json({message: 'Category deleted from store successfully'});
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