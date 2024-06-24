const Subscription = require('../model/SubscriptionModel.js');

const findSubscriptionById = async (id) => {
    return await Subscription.findById(id);
};

module.exports = {
    findSubscriptionById,
}