const Store = require('../model/StoreModel');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');

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
    if(!id){
        const err = new CustomError('Invalid Store ID', 400);
        return next(err);
    }
    const store = await Store.findById(id);
    if(!store){
        const err = new CustomError('Error while fetching Store', 400);
        return next(err);
    }
    res.status(200).json(store);
});

module.exports = {
    GetAllStores,
    GetStore
}