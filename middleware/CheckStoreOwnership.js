const mongoose = require('mongoose');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const StoreService = require('../service/StoreService.js');

const checkStoreOwnership = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    //check if the store id is provided
    if (!store || !mongoose.Types.ObjectId.isValid(store)) {
        const err = new CustomError('ID de magasin invalide', 400);
        return next(err);
    }

    //check if the store is the same as the user authenticated
    if (store !== req.user._id.toString()) {
        const err = new CustomError('Accès non autorisé', 401);
        return next(err);
    }

    //check if the store exist
    const existStore = await StoreService.findStoreById(store);
    if (!existStore) {
        const err = new CustomError('Magasin non trouvé', 401);
        return next(err);
    }

    next(); 
});

module.exports = checkStoreOwnership;
