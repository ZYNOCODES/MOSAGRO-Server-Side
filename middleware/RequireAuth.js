const jwt = require('jsonwebtoken');
const User = require('../model/UserModel');
const Store = require('../model/StoreModel');
const Admin = require('../model/AdminModel');
const SubscriptionStore = require('../model/SubscriptionStoreModel');
const CustomError = require('../util/CustomError');
const asyncErrorHandler = require('../util/asyncErrorHandler');
const moment = require('../util/Moment.js');


const requireAuth = asyncErrorHandler(async (req, res, next) => {
    const timezone = 'Africa/Algiers';
    const currentTime = moment.getCurrentDateTime(); // Ensures UTC+1
    // Check if User is logged in
    const {authorization} = req.headers;
    
    if(!authorization || !authorization.startsWith('Bearer ')){
        // If User is not logged in, return error
        const err = new CustomError('authorization token is required', 401);
        return next(err);
    }
    // Get token from header
    const token = authorization.split(' ')[1];

    // Verify token
    let decodedToken;
    try {
        decodedToken = jwt.verify(token, process.env.SECRET_KEY);
    } catch (err) {
        console.log(err)
        const error = new CustomError('Invalid or expired token. Please log in again.', 401);
        return next(error);
    }

    const { id, type, exp } = decodedToken;
    // Check if the token has expired
    if (currentTime.isSameOrAfter(exp * 1000)) {
        const err = new CustomError('Token has expired. Please log in again.', 401);
        return next(err);
    }
    // check user exists and assign to req.user
    switch (type) {
        case process.env.CLIENT_TYPE:
            req.user = await User.findById(id);
            break;
        case process.env.ADMIN_TYPE:
            req.user = await Admin.findById(id);
            break;
        case process.env.STORE_TYPE:
            req.user = await Store.findById(id);
            // Check if the store was found
            if (!req.user) {
                const err = new CustomError('User not found', 404);
                return next(err);
            }
            //check if subscription is still valid
            if(req.user.subscriptions.length > 0 ){
                //get subscription details
                const subscription = await SubscriptionStore.findById(
                    req.user.subscriptions[req.user.subscriptions.length - 1]
                );
                if(!subscription){
                    const err = new CustomError('Subscription not found', 404);
                    return next(err);
                }
                //check if subscription has expired
                if(currentTime.isSameOrAfter(subscription.expiryDate)){
                    //update Store status to suspended
                    await Store.updateOne({ _id: id }, { status: 'Suspended' });
                    const err = new CustomError('Subscription has expired', 401);
                    return next(err);
                }
            }else{
                const err = new CustomError('No subscription exists for this profile', 401);
                return next(err);
            }
            break;
        default:
            const err = new CustomError('Authentication rejected', 404);
            return next(err);
    }
    // Check if the user was found
    if(!req.user){
        const err = new CustomError('Authentication rejected', 404);
        return next(err);
    }
    // Continue to next middleware
    next();
});

module.exports = requireAuth;