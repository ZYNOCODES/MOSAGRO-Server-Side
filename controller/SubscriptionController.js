const Subscription = require('../model/SubscriptionModel.js');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const SubscriptionStoreService = require('../service/SubscriptionStoreService');

//create a new Subscription
const CreateSubscription = asyncErrorHandler(async (req, res, next) => {
    const { Name, Amount } = req.body;
    // check if all required fields are provided
    if(!Name || !Amount){
        const err = new CustomError('Tous les champs obligatoires doivent être remplis', 400);
        return next(err);
    }
    //check if the Subscription already exist
    const existSubscription = await Subscription.findOne({ 
        name: Name
    });
    if(existSubscription){
        const err = new CustomError('Un abonnement avec ce nom existe déjà', 400);
        return next(err);
    }
    //create a new Subscription
    const newSubscription = await Subscription.create({
        name : Name,
        amount : Amount
    });
    //check if Subscription created successfully
    if(!newSubscription){
        const err = new CustomError('Erreur lors de la création de l\'abonnement, essayez à nouveau.', 400);
        return next(err);
    }
    res.status(200).json({message: 'Abonnement créé avec succès', Subscription: newSubscription});
});

//fetch all Subscriptions
const GetAllSubscriptions = asyncErrorHandler(async (req, res, next) => {
    const Subscriptions = await Subscription.find({});
    if(!Subscriptions || Subscriptions.length < 1){
        const err = new CustomError('Aucun abonnement trouvé', 404);
        return next(err);
    }
    res.status(200).json(Subscriptions);
});

//update Subscription
const UpdateSubscription = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { Name, Amount } = req.body;

    // Check if at least one field is provided
    if (!Name && !Amount) {
        const err = new CustomError('Un des champs obligatoires doit être fourni', 400);
        return next(err);
    }

    // Check if Subscription exists
    const subscription = await Subscription.findById(id);
    if (!subscription) {
        const err = new CustomError('Abonnement non trouvé', 404);
        return next(err);
    }

    // Prepare update fields
    const updateFields = {};
    if (Name) updateFields.name = Name;
    if (Amount) updateFields.amount = Amount;

    // Update Subscription
    const updatedSubscription = await Subscription.updateOne({ _id: id }, { $set: updateFields });

    // Check if Subscription updated successfully
    if (!updatedSubscription) {
        const err = new CustomError('Erreur lors de la mise à jour de l\'abonnement, essayez à nouveau.', 400);
        return next(err);
    }

    res.status(200).json({ message: 'Abonnement mis à jour avec succès' });
});

//delete Subscription
const DeleteSubscription = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    //check if Subscription exist
    const subscription = await Subscription.findById(id);
    if(!subscription){
        const err = new CustomError('Abonnement non trouvé', 404);
        return next(err);
    }
    //check if there is no subscription store related to this subscription
    const existingStoreSubscription = await SubscriptionStoreService.findSubscriptionStoreByIDSubscription(subscription._id);
    if (existingStoreSubscription) { 
        const err = new CustomError('Impossible de supprimer l\'abonnement car il est lié à un magasin.', 400);
        return next(err);
    }
    //delete Subscription
    const deletedSubscription = await Subscription.deleteOne({_id: id});
    //check if Subscription deleted successfully
    if(!deletedSubscription){
        const err = new CustomError('Erreur lors de la suppression de l\'abonnement, essayez à nouveau.', 400);
        return next(err);
    }
    res.status(200).json({message: 'Abonnement supprimé avec succès'});
});

module.exports = {
    CreateSubscription,
    GetAllSubscriptions,
    UpdateSubscription,
    DeleteSubscription
}