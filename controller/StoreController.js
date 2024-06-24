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


module.exports = {
    GetAllStores,
}