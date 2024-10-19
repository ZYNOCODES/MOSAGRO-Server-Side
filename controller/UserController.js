const mongoose = require('mongoose');
const User = require('../model/UserModel');
const MyStores = require('../model/MyStoresModel');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const CitiesService = require('../service/CitiesService.js');
const validator = require('validator');

//fetch all Clients unverified
const GetAllClientsUnverified = asyncErrorHandler(async (req, res, next) => {
    const Users = await User.find({
        isRCVerified: false,
        isBlocked: false
    }).select('firstName lastName phoneNumber wilaya commune r_commerce email isRCVerified isBlocked');
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
    }).select('firstName lastName phoneNumber wilaya commune r_commerce email isRCVerified isBlocked');
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
//fetch all clients verified
const GetAllClientsVerified = asyncErrorHandler(async (req, res, next) => {
    const Users = await User.find({
        isRCVerified: true,
        isBlocked: false
    }).select('firstName lastName phoneNumber wilaya commune r_commerce email isRCVerified isBlocked');
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
//block specific client
const BlockClient = asyncErrorHandler(async (req, res, next) => {
    const { client } = req.body;
    if(!client || !mongoose.Types.ObjectId.isValid(client)){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    const existingClient = await User.findById(client);
    if(!existingClient){
        const err = new CustomError('Client not found', 404);
        return next(err);
    }
    existingClient.isBlocked = true;
    const updatedClient = await existingClient.save();
    if(!updatedClient){
        const err = new CustomError('Error while blocking client', 500);
        return next(err);
    }
    res.status(200).json({message: 'Client blocked successfully'});
});
//unblock specific client
const UnblockClient = asyncErrorHandler(async (req, res, next) => {
    const { client } = req.body;
    if(!client || !mongoose.Types.ObjectId.isValid(client)){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    const existingClient = await User.findById(client);
    if(!existingClient){
        const err = new CustomError('Client not found', 404);
        return next(err);
    }
    existingClient.isBlocked = false;
    const updatedClient = await existingClient.save();
    if(!updatedClient){
        const err = new CustomError('Error while unblocking client', 500);
        return next(err);
    }
    res.status(200).json({message: 'Client unblocked successfully'});
});
//verify specific client
const VerifyClient = asyncErrorHandler(async (req, res, next) => {
    const { client, RC } = req.body;
    if(!client || !mongoose.Types.ObjectId.isValid(client)){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    const existingClient = await User.findById(client);
    if(!existingClient){
        const err = new CustomError('Client not found', 404);
        return next(err);
    }

    if(RC && !validator.isEmpty(RC)) existingClient.r_commerce = RC;
    existingClient.isRCVerified = true;
    existingClient.isBlocked = false;

    const updatedClient = await existingClient.save();
    if(!updatedClient){
        const err = new CustomError('Error while verifying client', 500);
        return next(err);
    }
    res.status(200).json({message: 'Client verified successfully'});
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
    GetAllClientsVerified,
    GetAllClientsUnverified,
    GetAllClientsBlocked,
    GetClientByIdForStore,
    BlockClient,
    UnblockClient,
    VerifyClient
}