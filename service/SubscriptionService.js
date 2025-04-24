const Subscription = require('../model/SubscriptionModel.js');

const findSubscriptionById = async (id) => {
    return await Subscription.findById(id);
};
const findBasicSubscription = async () => {
    return await Subscription.findOne({ name: 'Basic' });
}

module.exports = {
    findSubscriptionById,
    findBasicSubscription
}