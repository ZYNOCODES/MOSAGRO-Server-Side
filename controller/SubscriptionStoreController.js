const mongoose = require('mongoose');
const SubscriptionStore = require('../model/SubscriptionStoreModel.js');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const SubscriptionService = require('../service/SubscriptionService.js');
const StoreService = require('../service/StoreService.js');
const StoreModel = require('../model/StoreModel');
const moment = require('moment');
const UtilMoment = require('../util/Moment.js');

//create a new Subscription for a specific store from store
const CreateSubsecriptionStoreByStore = asyncErrorHandler(async (req, res, next) => {
    const currentTime = UtilMoment.getCurrentDateTime(); // Ensures UTC+1
    const { Store, Subscription, expiryMonths } = req.body;
    // check if all required fields are provided
    if(!Store || !Subscription){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    //check if expiryMonths is a number
    if(isNaN(expiryMonths) || expiryMonths < 1){
        const err = new CustomError('You must select a subscription duration', 400);
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
    
    // Calculate the expiry date based on subscription duration
    const ExpiryDate = currentTime.clone().add(expiryMonths, 'months');
    
    // Start a session for the transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        // Check if store already has an active subscription
        const lastSubscription = await SubscriptionStore.findOne(
            { store: existingStore._id },
            null,
            { session }
        ).sort({ startDate: -1 }).limit(1);

        if (lastSubscription && currentTime.isBefore(moment(lastSubscription.expiryDate))) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('You already have an active subscription', 400));
        }
        // Create a new subscription store
        await SubscriptionStore.create([{
            store: existingStore._id,
            subscription: existingSubscription._id,
            amount: Number(existingSubscription.amount) * expiryMonths,
            startDate: currentTime,
            expiryDate: ExpiryDate,
        }], { session });

        // Add Subscription ID to Store's subscriptions list
        await StoreModel.updateOne(
            { _id: Store },
            { status: 'Active' },
            { session }
        );

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: 'Subscription created and added to store successfully' });
    } catch (error) {
        console.log(error);
        // Abort the transaction and end the session
        await session.abortTransaction();
        session.endSession();
        return next(new CustomError('An error occurred while creating the subscription', 500));
    }
});
//create a new Subscription for a specific store from admin
const CreateSubsecriptionStoreByAdmin = asyncErrorHandler(async (req, res, next) => {
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

    // Calculate the expiry date based on subscription duration
    const ExpiryDate = currentTime.clone().add(expiryMonths, 'months');

    // Start a session for the transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Check if store already has an active subscription
        const lastSubscription = await SubscriptionStore.findById({
            store: existingStore._id
        }, { session } ).sort({ startDate: -1 }).limit(1);
        if (lastSubscription && currentTime.isBefore(moment(lastSubscription.expiryDate))) {
            //close the last subscription
            lastSubscription.expiryDate = currentTime;
            await lastSubscription.save({ session });
        }
        // Create a new subscription store
        await SubscriptionStore.create([{
            store: existingStore._id,
            subscription: existingSubscription._id,
            amount: existingSubscription.amount,
            startDate: currentTime,
            expiryDate: ExpiryDate,
        }], { session });

        // update store status to active
        await StoreModel.updateOne(
            { _id: Store },
            { status: 'Active' },
            { session }
        );

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
    // get all subscriptions for the store
    const subscriptions = await SubscriptionStore.find({ 
        store: existingStore._id 
    }).populate({
        path: 'subscription',
        select: 'name amount'
    });
    // check if subscriptions found
    if(!subscriptions || subscriptions.length <= 0){
        const err = new CustomError('No subscriptions found for this store', 404);
        return next(err);
    }

    res.status(200).json(subscriptions);
});

module.exports = {
    CreateSubsecriptionStoreByStore,
    CreateSubsecriptionStoreByAdmin,
    GetAllSubsecriptionStoreByStore
}