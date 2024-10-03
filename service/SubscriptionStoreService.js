const SubscriptionStore = require('../model/SubscriptionStoreModel.js');

const findSubscriptionStoreByIDStore = async (Store) => {
    return await SubscriptionStore.findOne(
        {
            store: Store
        }
    )
};
const findSubscriptionStoreByIDSubscription = async (Subscription) => {
    return await SubscriptionStore.findOne(
        {
            subscription: Subscription
        }
    )
};

module.exports = {
    findSubscriptionStoreByIDStore,
    findSubscriptionStoreByIDSubscription
}