const mongoose = require('mongoose');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const ClientService = require('../service/ClientService.js');

const checkClientOwnership = asyncErrorHandler(async (req, res, next) => {
    const { client } = req.params;
    //check if the store id is provided
    if (!client || !mongoose.Types.ObjectId.isValid(client)) {
        const err = new CustomError('Invalid client ID', 400);
        return next(err);
    }

    //check if the store is the same as the user authenticated
    if (client !== req.user._id.toString()) {
        const err = new CustomError('Unauthorized access', 401);
        return next(err);
    }

    //check if the store exist
    const existClient = await ClientService.findClientById(client);
    if (!existClient) {
        const err = new CustomError('Client not found', 401);
        return next(err);
    }

    next(); 
});

module.exports = checkClientOwnership;
