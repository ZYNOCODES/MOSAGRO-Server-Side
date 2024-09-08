const mongoose = require('mongoose');
const validator = require('validator');
const Store = require('../model/StoreModel');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const CitiesService = require('../service/CitiesService.js')

//fetch all Stores
const GetAllStores = asyncErrorHandler(async (req, res, next) => {
    const Stores = await Store.find({});
    if(!Stores){
        const err = new CustomError('Error while fetching Stores', 400);
        return next(err);
    }
    res.status(200).json(Stores);
});
//fetch specific Store
const GetStore = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    //check if id is valid 
    if(!id || !mongoose.Types.ObjectId.isValid(id)){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    const store = await Store.findById(id);
    if(!store){
        const err = new CustomError('Store not found', 400);
        return next(err);
    }

    const wilaya = await CitiesService.findCitiesFRByCodeC(store.wilaya, store.commune);
    
    const response = {
        ...store.toObject(),
        wilaya: wilaya.wilaya,
        commune: wilaya.baladiya
    };
    
    res.status(200).json(response);
});
//update specific Store info
const UpdateStore = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { firstName, lastName, email, phone, 
        wilaya, commune, address, storeName, location, RC } = req.body;
    //check if id is valid 
    if(!id || !mongoose.Types.ObjectId.isValid(id)){
        const err = new CustomError('Missing required fealds', 400);
        return next(err);
    }
    //check if at least one field is provided
    if(!firstName && !lastName && !email && !phone && !wilaya &&
        !commune && !address && !storeName && !location && !RC){
        const err = new CustomError('At least one field is required', 400);
        return next(err);
    }
    //validate email
    if(email && !validator.isEmail(email)){
        const err = new CustomError('Invalid email', 400);
        return next(err);
    }
    //validate phone number must start with 06 or 07 or 05
    if(phone && !validator.isMobilePhone(phone, 'ar-DZ')){
        const err = new CustomError('Invalid phone number', 400);
        return next(err);
    }
    //check wilaya and commune
    if(wilaya && commune){
        const checkWilaya = await CitiesService.findCitiesFRByCodeC(wilaya, commune);
        if(!checkWilaya){
            const err = new CustomError('Invalid wilaya or commune', 400);
            return next(err);
        }
    }else if(wilaya && !commune){
        const err = new CustomError('Commune is required', 400);
        return next(err);
    }else if(commune && !wilaya){
        const err = new CustomError('Wilaya is required', 400);
        return next(err);
    }
    //update Store
    const store = await Store.findOne({_id: id});
    if(!store){
        const err = new CustomError('Store not found', 404);
        return next(err);
    }
    //check if store phone number is unique
    if(phone && store.phoneNumber != phone){
        //check if phone number already exist
        const checkPhone = await Store.findOne({
            phoneNumber: phone,
            _id: {$ne: id}
        });
        if(checkPhone){
            const err = new CustomError('Phone number already exist', 400);
            return next(err);
        }
        store.phoneNumber = phone;
    }
    //check if store email is unique
    if(email && store.email != email){
        //check if email already exist
        const checkEmail = await Store.findOne({
            email: email,
            _id: {$ne: id}
        });
        if(checkEmail){
            const err = new CustomError('Email already exist', 400);
            return next(err);
        }
        store.email = email;
    }
    
    //update Store info
    if(firstName) store.firstName = firstName;
    if(lastName) store.lastName = lastName;
    if(wilaya) store.wilaya = wilaya;
    if(commune) store.commune = commune;
    if(address) store.storeAddress = address;
    if(storeName) store.storeName = storeName;
    if(location) store.storeLocation = location;
    if(RC) store.r_commerce = RC;
    //save updated Store
    const updatedStore = await store.save();
    if(!updatedStore){
        const err = new CustomError('Error while updating Store', 400);
        return next(err);
    }
    res.status(200).json({message: 'Store updated successfully'});
});

module.exports = {
    GetAllStores,
    GetStore,
    UpdateStore
}