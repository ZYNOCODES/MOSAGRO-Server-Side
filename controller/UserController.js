const mongoose = require('mongoose');
const User = require('../model/UserModel');
const MyStores = require('../model/MyStoresModel');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const CitiesService = require('../service/CitiesService.js')

//fetch all Users
const GetAllUsers = asyncErrorHandler(async (req, res, next) => {
    const Users = await User.find({});
    if(!Users){
        const err = new CustomError('Error while fetching Users', 400);
        return next(err);
    }
    res.status(200).json(Users);
});
//fetch specific user by id
const GetUserByIdForStore = asyncErrorHandler(async (req, res, next) => {
    const { id, store } = req.params;
    if(!id || !store ||
        !mongoose.Types.ObjectId.isValid(id) ||
        !mongoose.Types.ObjectId.isValid(store)
    ){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }

    //check if store already exists
    const myStore = await MyStores.findOne({ 
        user: id,
        store: store,
    });

    if(!myStore){
        const err = new CustomError('Client not found in your list', 400);
        return next(err);
    }

    const user = await User.findById(id);
    if(!user){
        const err = new CustomError('User not found', 404);
        return next(err);
    }
    
    const wilaya = await CitiesService.findCitiesFRByCodeC(user.wilaya, user.commune);
    
    const response = {
        ...user.toObject(),
        wilaya: wilaya.wilaya,
        commune: wilaya.baladiya,
        isSeller: myStore.isSeller
    };
    
    res.status(200).json(response);
});


module.exports = {
    GetAllUsers,
    GetUserByIdForStore,
}