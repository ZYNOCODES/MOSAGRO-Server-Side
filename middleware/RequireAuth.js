const jwt = require('jsonwebtoken');
const User = require('../model/UserModel');
const CustomError = require('../util/CustomError');
const asyncErrorHandler = require('../util/asyncErrorHandler');

const requireAuth = asyncErrorHandler(async (req, res, next) => {
    // Check if User is logged in
    const {authorization} = req.headers;
    
    if(!authorization){
        // If User is not logged in, return error
        const err = new CustomError('authorization token is required', 401);
        return next(err);
    }
    // Get token from header
    const token = authorization.split(' ')[1];

    // Verify token
    const { id, exp } = jwt.verify(token, process.env.SECRET_KEY);

    // Check if the token has expired
    if (Date.now() >= exp * 1000) {
        const err = new CustomError('Token has expired. Please log in again.', 401);
        return next(err);
    }
    // Add User to request
    req.user = await User.findOne({_id: id}).select('_id');

    // Continue to next middleware
    next();
});
module.exports = requireAuth;