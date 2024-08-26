const Category = require('../model/CategoryModel.js');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const CategoryService = require('../service/CategoryService.js');

//create a new Category
const CreateCategory = asyncErrorHandler(async (req, res, next) => {
    const { Name } = req.body;
    // check if all required fields are provided
    if(!Name){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    //check if the code is valid
    const existCategory = await Category.findOne({name: Name});
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

//fetch all Categorys
const GetAllCategorys = asyncErrorHandler(async (req, res, next) => {
    const Categorys = await Category.find({});
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
    if (!Name) {
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

module.exports = {
    CreateCategory,
    GetAllCategorys,
    UpdateCategoryName,
    DeleteCategory
}