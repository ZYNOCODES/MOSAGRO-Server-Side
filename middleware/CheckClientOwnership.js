const mongoose = require('mongoose');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');

const checkClientOwnership = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    //check if the store id is provided
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        const err = new CustomError('Invalid client ID', 400);
        return next(err);
    }

    //check if the store is the same as the user authenticated
    if (id !== req.user._id.toString()) {
        const err = new CustomError('Unauthorized access', 401);
        return next(err);
    }

    next(); 
});

module.exports = checkClientOwnership;
