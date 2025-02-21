const Subscription = require('../model/SubscriptionModel.js');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const SubscriptionStoreService = require('../service/SubscriptionStoreService');

//create a new Subscription
const CreateSubscription = asyncErrorHandler(async (req, res, next) => {
    const { Name, Amount } = req.body;
    // check if all required fields are provided
    if(!Name || !Amount){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    //check if the Subscription already exist
    const existSubscription = await Subscription.findOne({ 
        name: Name
    });
    if(existSubscription){
        const err = new CustomError('An existing subscription use that name. Please use another name', 400);
        return next(err);
    }
    //create a new Subscription
    const newSubscription = await Subscription.create({
        name : Name,
        amount : Amount
    });
    //check if Subscription created successfully
    if(!newSubscription){
        const err = new CustomError('Error while creating Subscription try again.', 400);
        return next(err);
    }
    res.status(200).json({message: 'Subscription created successfully'});
});

//fetch all Subscriptions
const GetAllSubscriptions = asyncErrorHandler(async (req, res, next) => {
    const Subscriptions = await Subscription.find({});
    if(!Subscriptions){
        const err = new CustomError('Error while fetching Subscriptions', 400);
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
        const err = new CustomError('One of the fields is required at least', 400);
        return next(err);
    }

    // Check if Subscription exists
    const subscription = await Subscription.findById(id);
    if (!subscription) {
        const err = new CustomError('Subscription not found', 400);
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
        const err = new CustomError('Error while updating Subscription, try again.', 400);
        return next(err);
    }

    res.status(200).json({ message: 'Subscription updated successfully' });
});

//delete Subscription
const DeleteSubscription = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    //check if Subscription exist
    const subscription = await Subscription.findById(id);
    if(!subscription){
        const err = new CustomError('Subscription not found', 400);
        return next(err);
    }
    //check if there is no subscription store related to this subscription
    const existingStoreSubscription = await SubscriptionStoreService.findSubscriptionStoreByIDSubscription(subscription._id);
    if (existingStoreSubscription) { 
        const err = new CustomError('Cannot delete subscription as it is linked to a store.', 400);
        return next(err);
    }
    //delete Subscription
    const deletedSubscription = await Subscription.deleteOne({_id: id});
    //check if Subscription deleted successfully
    if(!deletedSubscription){
        const err = new CustomError('Error while deleting Subscription try again.', 400);
        return next(err);
    }
    res.status(200).json({message: 'Subscription deleted successfully'});
});

module.exports = {
    CreateSubscription,
    GetAllSubscriptions,
    UpdateSubscription,
    DeleteSubscription
}