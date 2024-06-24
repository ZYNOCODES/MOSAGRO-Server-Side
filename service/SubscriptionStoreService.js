const SubscriptionStore = require('../model/SubscriptionStoreModel.js');

const findSubscriptionStoreByIDStore = async (Store) => {
    return await SubscriptionStore.findOne(
        {
            store: Store
        }
    )
};

module.exports = {
    findSubscriptionStoreByIDStore,
}