const mongoose = require('mongoose');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const SubscriptionStoreService = require('../service/SubscriptionStoreService.js');
const UtilMoment = require('../util/Moment.js');
const moment = require('moment');
const Store = require('../model/StoreModel');

const checkSubscription = asyncErrorHandler(async (req, res, next) => {
    const currentTime = UtilMoment.getCurrentDateTime();
    //check on req.userType == process.env.STORE_TYPE
    if (req.userType !== process.env.STORE_TYPE) {
        return next();
    }

    //check if subscription still valid
    const existSubscription = await SubscriptionStoreService.findLastSubscriptionStoreByStore(req.user._id);
    if (!existSubscription) {
        const err = new CustomError('You do not have an active subscription', 400);
        return next(err);
    }
    if (currentTime.isSameOrAfter(moment(existSubscription.expiryDate))) {
        //update Store status to suspended
        await Store.updateOne({ _id: id }, { status: 'Suspended' });
        const err = new CustomError('Your subscription has expired', 400);
        return next(err);
    }

    next(); 
});

module.exports = checkSubscription;
