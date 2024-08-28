const mongoose = require('mongoose');
const User = require('../model/UserModel');
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
const GetUserById = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    if(!id || !mongoose.Types.ObjectId.isValid(id)){
        const err = new CustomError('All fields are required', 400);
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
        commune: wilaya.baladiya
    };
    
    res.status(200).json(response);
});


module.exports = {
    GetAllUsers,
    GetUserById,
}