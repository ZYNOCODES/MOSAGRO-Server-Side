const mongoose = require('mongoose');
const User = require('../model/UserModel');
const MyStores = require('../model/MyStoresModel');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const CitiesService = require('../service/CitiesService.js')

//fetch all Clients unverified
const GetAllClientsUnverified = asyncErrorHandler(async (req, res, next) => {
    const Users = await User.find({
        isRCVerified: false,
        isBlocked: false
    }).select('firstName lastName phoneNumber wilaya commune r_commerce email');
    if(!Users || Users.length <= 0){
        const err = new CustomError('No client found', 404);
        return next(err);
    }
    //for each user, get the wilaya and commune
    const response = await Promise.all(Users.map(async (user) => {
        const wilaya = await CitiesService.findCitiesFRByCodeC(user.wilaya, user.commune);
        return {
            ...user.toObject(),
            wilaya: wilaya.wilaya,
            commune: wilaya.baladiya
        }
    }));
    res.status(200).json(response);
});
//fetch all Clients blocked
const GetAllClientsBlocked = asyncErrorHandler(async (req, res, next) => {
    const Users = await User.find({
        isBlocked: true
    }).select('firstName lastName phoneNumber wilaya commune r_commerce email');
    if(!Users || Users.length <= 0){
        const err = new CustomError('No client found', 404);
        return next(err);
    }
    //for each user, get the wilaya and commune
    const response = await Promise.all(Users.map(async (user) => {
        const wilaya = await CitiesService.findCitiesFRByCodeC(user.wilaya, user.commune);
        return {
            ...user.toObject(),
            wilaya: wilaya.wilaya,
            commune: wilaya.baladiya
        }
    }));
    res.status(200).json(response);
});
//fetch specific user by id
const GetClientByIdForStore = asyncErrorHandler(async (req, res, next) => {
    const { id, store } = req.params;
    if(!id || !mongoose.Types.ObjectId.isValid(id)){
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
    GetAllClientsUnverified,
    GetAllClientsBlocked,
    GetClientByIdForStore,
}