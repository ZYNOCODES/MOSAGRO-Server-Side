const SubscriptionStore = require('../model/SubscriptionStoreModel.js');

const findLastSubscriptionStoreByStore = async (Store) => {
    return await SubscriptionStore.findOne({ 
        store: Store,
        validation: true 
    }).sort({ startDate: -1 }).limit(1);
};
const findSubscriptionStoreByIDSubscription = async (Subscription) => {
    return await SubscriptionStore.findOne(
        {
            subscription: Subscription
        }
    )
};

module.exports = {
    findLastSubscriptionStoreByStore,
    findSubscriptionStoreByIDSubscription
}