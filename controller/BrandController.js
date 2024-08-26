const Brand = require('../model/BrandModel.js');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const { BrandCode } = require('../util/Codification.js');
const BrandService = require('../service/BrandService.js');

//create a new brand
const CreateBrand = asyncErrorHandler(async (req, res, next) => {
    const { Name, Image, Code } = req.body;
    // check if all required fields are provided
    if(!Name || !Image || !Code){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    //check if the code is valid
    const existCodeBrand = await Brand.findOne({code: Code});
    if(existCodeBrand){
        const err = new CustomError('An existing brand use that code. try again.', 400);
        return next(err);
    }
    //create a new brand
    const newBrand = await Brand.create({
        code : Code,
        name : Name,
        image : Image
    });
    //check if brand created successfully
    if(!newBrand){
        const err = new CustomError('Error while creating brand try again.', 400);
        return next(err);
    }
    res.status(200).json({message: 'Brand created successfully'});
});

//fetch all brands
const GetAllBrands = asyncErrorHandler(async (req, res, next) => {
    const brands = await Brand.find({});
    if(!brands || brands.length < 1){
        const err = new CustomError('No brand found', 400);
        return next(err);
    }
    res.status(200).json(brands);
});

//update brand
const UpdateBrandName = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { Name, Code } = req.body;

    // Check if at least one field is provided
    if (!Name && !Code) {
        const err = new CustomError('One of the fields is required at least', 400);
        return next(err);
    }

    // Check if brand exists
    const brand = await BrandService.findBrandById(id);
    if (!brand) {
        const err = new CustomError('Brand not found', 400);
        return next(err);
    }

    // Prepare update fields
    const updateFields = {};
    if (Name) updateFields.name = Name;
    if (Code) updateFields.code = Code;

    // Update brand
    const updatedBrand = await Brand.updateOne({ _id: id }, { $set: updateFields });

    // Check if brand updated successfully
    if (!updatedBrand) {
        const err = new CustomError('Error while updating brand, try again.', 400);
        return next(err);
    }

    res.status(200).json({ message: 'Brand updated successfully' });
});


//delete brand
const DeleteBrand = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    //check if brand exist
    const brand = await BrandService.findBrandById(id);
    if(!brand){
        const err = new CustomError('Brand not found', 400);
        return next(err);
    }
    //delete brand
    const deletedBrand = await Brand.deleteOne({_id: id});
    //check if brand deleted successfully
    if(!deletedBrand){
        const err = new CustomError('Error while deleting brand try again.', 400);
        return next(err);
    }
    res.status(200).json({message: 'Brand deleted successfully'});
});

module.exports = {
    CreateBrand,
    GetAllBrands,
    UpdateBrandName,
    DeleteBrand
}