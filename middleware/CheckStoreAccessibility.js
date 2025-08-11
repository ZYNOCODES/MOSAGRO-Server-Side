const mongoose = require('mongoose');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const StoreService = require('../service/StoreService.js');
const ClientService = require('../service/ClientService.js');
const MyStoreService = require('../service/MyStoreService.js')

const CheckStoreAccessibility = asyncErrorHandler(async (req, res, next) => {
    const { store, client } = req.params;
    //check if the store id is provided
    if (!store || !mongoose.Types.ObjectId.isValid(store) ||
        !client || !mongoose.Types.ObjectId.isValid(client)) {
        const err = new CustomError('ID de magasin ou ID client non valide', 400);
        return next(err);
    }

    //check if the store exist
    const existStore = await StoreService.findStoreById(store);
    if (!existStore) {
        const err = new CustomError('Magasin non trouvé', 401);
        return next(err);
    }
    //check if the client exist
    const existClient = await ClientService.findClientById(client);
    if (!existClient) {
        const err = new CustomError('Magasin non trouvé', 401);
        return next(err);
    }

    //check if the client is a member of the store
    const isMember = await MyStoreService.checkUserStore(client, store);
    if (!isMember) {
        const err = new CustomError('Vous n\'êtes pas membre de ce magasin, vous ne pouvez pas y accéder', 401);
        return next(err);
    }

    //continue to the next middleware
    next(); 
});

module.exports = CheckStoreAccessibility;
