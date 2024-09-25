const mongoose = require('mongoose');
const SubscriptionStore = require('../model/SubscriptionStoreModel.js');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const SubscriptionService = require('../service/SubscriptionService.js');
const StoreService = require('../service/StoreService.js');
const StoreModel = require('../model/StoreModel');
const moment = require('moment');
const UtilMoment = require('../util/Moment.js');

//create a new brand
const CreateSubsecriptionStore = asyncErrorHandler(async (req, res, next) => {
    const currentTime = UtilMoment.getCurrentDateTime(); // Ensures UTC+1
    const { Store, Subscription, expiryMonths } = req.body;
    // check if all required fields are provided
    if(!Store || !Subscription){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    //check if expiryMonths is a number
    if(isNaN(expiryMonths) || expiryMonths < 1){
        const err = new CustomError('Expiry months must be a number greater than 0', 400);
        return next(err);
    }
    //check if store found
    const existingStore = await StoreService.findStoreById(Store);
    if(!existingStore){
        const err = new CustomError('Store not found', 404);
        return next(err);
    }
    //check if subscription found
    const existingSubscription = await SubscriptionService.findSubscriptionById(Subscription);
    if(!existingSubscription){
        const err = new CustomError('Subscription not found', 404);
        return next(err);
    }
    // Check if store already has an active subscription
    let lastSubscription = null;
    if (existingStore.subscriptions && existingStore.subscriptions.length > 0) {
        lastSubscription = await SubscriptionStore.findById(existingStore.subscriptions[existingStore.subscriptions.length - 1]);
        if (lastSubscription && currentTime.isBefore(moment(lastSubscription.expiryDate))) {
            const err = new CustomError('Store already has an active subscription', 400);
            return next(err);
        }
    }

    // Calculate the expiry date based on subscription duration
    const ExpiryDate = currentTime.clone().add(expiryMonths, 'months');

    // Start a session for the transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Create a new subscription store
        const newSubscriptionStore = await SubscriptionStore.create([{
            store: existingStore._id,
            subscription: existingSubscription._id,
            startDate: currentTime,
            expiryDate: ExpiryDate
        }], { session });

        // Add Subscription ID to Store's subscriptions list
        const updatedStore = await StoreModel.updateOne(
            { _id: Store },
            { $push: { subscriptions: newSubscriptionStore[0]._id }, status: 'Active' },
            { session }
        );

        // Check if the store was updated successfully
        if (updatedStore.nModified === 0) {
            throw new CustomError('Error while updating the store with the new subscription, try again.', 400);
        }

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: 'Subscription created and added to store successfully' });
    } catch (error) {
        // Abort the transaction and end the session
        await session.abortTransaction();
        session.endSession();
        return next(error);
    }
});

//Get all subscriptions for a specific store
const GetAllSubsecriptionStoreByStore = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    // check if id is valid
    if(!id || !mongoose.Types.ObjectId.isValid(id)){
        const err = new CustomError('Invalid store ID', 400);
        return next(err);
    }
    // check if store found
    const existingStore = await StoreService.findStoreById(id);
    if(!existingStore){
        const err = new CustomError('Store not found', 404);
        return next(err);
    }
    // check if store has subscriptions
    if (!existingStore.subscriptions || existingStore.subscriptions.length === 0) {
        const err = new CustomError('Store has no subscriptions', 400);
        return next(err);
    }
    // get all subscriptions for the store
    const subscriptions = await SubscriptionStore.find({ 
        store: existingStore._id 
    }).populate({
        path: 'subscription',
        select: 'name'
    });
    // check if subscriptions found
    if(!subscriptions || subscriptions.length === 0){
        const err = new CustomError('No subscriptions found for this store', 404);
        return next(err);
    }

    res.status(200).json(subscriptions);
});

module.exports = {
    CreateSubsecriptionStore,
    GetAllSubsecriptionStoreByStore
}