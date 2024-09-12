const SubscriptionStore = require('../model/SubscriptionStoreModel.js');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const SubscriptionStoreService = require('../service/SubscriptionStoreService.js');
const SubscriptionService = require('../service/SubscriptionService.js');
const StoreService = require('../service/StoreService.js');
const StoreModel = require('../model/StoreModel');
const moment = require('moment');
require('moment-timezone');
const mongoose = require('mongoose');


//create a new brand
const CreateSubsecriptionStore = asyncErrorHandler(async (req, res, next) => {
    const timezone = 'Africa/Algiers';
    const currentTime = moment().utc(1); // Ensures UTC+1
    const { Store, Subscription } = req.body;
    // check if all required fields are provided
    if(!Store || !Subscription){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    //check if store found
    const store = await StoreService.findStoreById(Store);
    if(!store){
        const err = new CustomError('Store not found', 404);
        return next(err);
    }
    // Check if store already has an active subscription
    let lastSubscription = null;
    if (store.subscriptions && store.subscriptions.length > 0) {
        lastSubscription = await SubscriptionStore.findById(store.subscriptions[store.subscriptions.length - 1]);
        if (lastSubscription && currentTime.isBefore(lastSubscription.expiryDate)) {
            const err = new CustomError('Store already has an active subscription', 400);
            return next(err);
        }
    }
    //check if subscription found
    const subscription = await SubscriptionService.findSubscriptionById(Subscription);
    if(!subscription){
        const err = new CustomError('Subscription not found', 404);
        return next(err);
    }
    // Calculate the expiry date based on subscription duration
    let ExpiryDate;
    if (subscription.duration >= 1) {
        ExpiryDate = currentTime.clone().add(subscription.duration, 'months');
    } else {
        const err = new CustomError('Invalid subscription duration', 400);
        return next(err);
    }
    // Start a session for the transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Create a new subscription store
        const newSubscriptionStore = await SubscriptionStore.create([{
            store: Store,
            subscription: Subscription,
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
    // check if store found
    const store = await StoreService.findStoreById(id);
    if(!store){
        const err = new CustomError('Store not found', 404);
        return next(err);
    }
    // check if store has subscriptions
    if (!store.subscriptions || store.subscriptions.length === 0) {
        const err = new CustomError('Store has no subscriptions', 400);
        return next(err);
    }
    // get all subscriptions for the store
    const subscriptions = await SubscriptionStore.find({ store: id });
    // get subscriptions details
    for (let i = 0; i < subscriptions.length; i++) {
        const subscription = await SubscriptionService.findSubscriptionById(subscriptions[i].subscription);
        subscriptions[i].subscription = subscription;
    }
    res.status(200).json(subscriptions);
});

module.exports = {
    CreateSubsecriptionStore,
    GetAllSubsecriptionStoreByStore
}