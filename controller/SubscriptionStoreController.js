const mongoose = require('mongoose');
const SubscriptionStore = require('../model/SubscriptionStoreModel.js');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const SubscriptionService = require('../service/SubscriptionService.js');
const StoreService = require('../service/StoreService.js');
const NotificationService = require('../service/NotificationService.js');
const StoreModel = require('../model/StoreModel');
const moment = require('moment');
const UtilMoment = require('../util/Moment.js');

//create a new Subscription for a specific store from store
const CreateSubsecriptionStoreByStore = asyncErrorHandler(async (req, res, next) => {
    const currentTime = UtilMoment.getCurrentDateTime();
    const { Store, Subscription, expiryMonths } = req.body;
    // check if all required fields are provided
    if(!Store || !Subscription){
        const err = new CustomError('Tous les champs sont obligatoires', 400);
        return next(err);
    }
    //check if expiryMonths is a number
    if(isNaN(expiryMonths) || expiryMonths < 1){
        const err = new CustomError('Vous devez choisir une durée d\'abonnement valide', 400);
        return next(err);
    }
    //check if store found
    const existingStore = await StoreService.findStoreById(Store);
    if(!existingStore){
        const err = new CustomError('Magasin non trouvé', 404);
        return next(err);
    }
    //check if subscription found
    const existingSubscription = await SubscriptionService.findSubscriptionById(Subscription);
    if(!existingSubscription){
        const err = new CustomError('Abonnement non trouvé', 404);
        return next(err);
    }
    //check if store have a pending subscription
    const pendingSubscription = await SubscriptionStore.findOne({ 
        store: existingStore._id, 
        validation: false 
    });
    if(pendingSubscription){
        const err = new CustomError('Vous avez déjà une demande d\'abonnement en attente qui doit être validée par l\'administrateur', 400);
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
            { 
                store: existingStore._id,
                validation: true
            },
            null,
            { session }
        ).sort({ startDate: -1 }).limit(1);

        if (lastSubscription && currentTime.isBefore(moment(lastSubscription.expiryDate))) {
            // Create a new subscription store
            await SubscriptionStore.create([{
                store: existingStore._id,
                subscription: existingSubscription._id,
                amount: Number(existingSubscription.amount) * expiryMonths,
                validation: false,
                startDate: lastSubscription.expiryDate,
                expiryDate: moment(lastSubscription.expiryDate).clone().add(expiryMonths, 'months'),
            }], { session });

        }else {
            // Create a new subscription store
            await SubscriptionStore.create([{
                store: existingStore._id,
                subscription: existingSubscription._id,
                amount: Number(existingSubscription.amount) * expiryMonths,
                validation: false,
                startDate: currentTime,
                expiryDate: ExpiryDate,
            }], { session });
        }
        // Send notification to admin
        const msg = "Une nouvelle demande d'abonnement a été effectué par le magasin: " + existingStore.storeName + " d'une durée de " + expiryMonths + " mois.";
        const newNotification = await NotificationService.createNewNotificationForAdmin(
            null,
            'subscription_request',
            msg,
            session
        );

        if (!newNotification || !newNotification[0]) {
            throw new CustomError('Erreur lors de la création de la notification', 500);
        }

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: 'Le magasin a été abonné avec succès. Une notification a été envoyée à l\'administrateur pour validation votre demande.' });
    } catch (error) {
        // Abort the transaction and end the session
        await session.abortTransaction();
        session.endSession();
        return next(new CustomError('Une erreur est survenue lors de la création de l\'abonnement', 500));
    }
});
//create a new Subscription for a specific store from admin
const CreateSubsecriptionStoreByAdmin = asyncErrorHandler(async (req, res, next) => {
    const currentTime = UtilMoment.getCurrentDateTime(); // Ensures UTC+1
    const { Store, Subscription, expiryMonths } = req.body;
    // check if all required fields are provided
    if(!Store || !Subscription){
        const err = new CustomError('Tous les champs sont obligatoires', 400);
        return next(err);
    }
    //check if expiryMonths is a number
    if(isNaN(expiryMonths) || expiryMonths < 1){
        const err = new CustomError('Vous devez choisir une durée d\'abonnement valide', 400);
        return next(err);
    }
    //check if store found
    const existingStore = await StoreService.findStoreById(Store);
    if(!existingStore){
        const err = new CustomError('Magasin non trouvé', 404);
        return next(err);
    }
    //check if subscription found
    const existingSubscription = await SubscriptionService.findSubscriptionById(Subscription);
    if(!existingSubscription){
        const err = new CustomError('Abonnement non trouvé', 404);
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
            return next(new CustomError('Le magasin a déjà un abonnement actif', 400));
        }
        // Create a new subscription store
        await SubscriptionStore.create([{
            store: existingStore._id,
            subscription: existingSubscription._id,
            amount: existingSubscription.amount,
            validation: true,
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

        res.status(200).json({ message: 'Le magasin a été abonné avec succès.' });
    } catch (error) {
        // Abort the transaction and end the session
        await session.abortTransaction();
        session.endSession();
        return next(new CustomError('Une erreur est survenue lors de la création de l\'abonnement', 500));
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
        store: existingStore._id,
        validation: true
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
//Get all subscription requests
const GetAllSubsecriptionRequests = asyncErrorHandler(async (req, res, next) => {
    const subscriptions = await SubscriptionStore.find({ 
        validation: false
    }).populate([
        {
            path: 'subscription',
            select: 'name amount'
        },
        {
            path: 'store',
            select: '_id firstName lastName phoneNumber storeName email'
        }
    ]);
    // check if subscriptions found
    if(!subscriptions || subscriptions.length <= 0){
        const err = new CustomError('No subscriptions found for this store', 404);
        return next(err);
    }

    res.status(200).json(subscriptions);
});
//validate subscription request
const ValidateSubscriptionRequest = asyncErrorHandler(async (req, res, next) => {
    const currentTime = UtilMoment.getCurrentDateTime();
    const { id } = req.params;
    // check if id is valid
    if(!id || !mongoose.Types.ObjectId.isValid(id)){
        const err = new CustomError('Tous les champs sont obligatoires', 400);
        return next(err);
    }
    // check if subscription found
    const existingSubscription = await SubscriptionStore.findById(id);
    if(!existingSubscription){
        const err = new CustomError('Magasin non trouvé', 404);
        return next(err);
    }

    const lastSubscription = await SubscriptionStore.findOne(
        { 
            store: existingSubscription.store,
            validation: true
        },
    ).sort({ startDate: -1 }).limit(1);

    if (lastSubscription && currentTime.isBefore(moment(lastSubscription.expiryDate))) {
        return next(new CustomError('Le magasin a déjà un abonnement actif', 400));
    }

    // validate the subscription
    const subscription_duration = moment(existingSubscription.expiryDate).diff(moment(existingSubscription.startDate), 'months');
    existingSubscription.validation = true;
    existingSubscription.startDate = currentTime;
    existingSubscription.expiryDate = currentTime.clone().add(subscription_duration, 'months');
    
    const updatedSubscription = await existingSubscription.save();

    // check if subscription updated
    if(!updatedSubscription){
        const err = new CustomError('Une erreur est survenue lors de la validation de l\'abonnement', 500);
        return next(err);
    }

    res.status(200).json({ message: 'L\'abonnement a été validé avec succès.' });
});



module.exports = {
    CreateSubsecriptionStoreByStore,
    CreateSubsecriptionStoreByAdmin,
    GetAllSubsecriptionStoreByStore,
    GetAllSubsecriptionRequests,
    ValidateSubscriptionRequest
}