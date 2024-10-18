const mongoose = require('mongoose');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const AdminService = require('../service/AdminService.js');

const checkAdminOwnership = asyncErrorHandler(async (req, res, next) => {
    const { admin } = req.params;
    //check if the Admin id is provided
    if (!admin || !mongoose.Types.ObjectId.isValid(admin)) {
        const err = new CustomError('Invalid admin ID', 400);
        return next(err);
    }

    //check if the Admin is the same as the user authenticated
    if (admin !== req.user._id.toString()) {
        const err = new CustomError('Unauthorized access', 401);
        return next(err);
    }

    //check if the Admin exist
    const existAdmin = await AdminService.findAdminById(admin);
    if (!existAdmin) {
        const err = new CustomError('Admin not found', 400);
        return next(err);
    }

    next(); 
});

module.exports = checkAdminOwnership;
