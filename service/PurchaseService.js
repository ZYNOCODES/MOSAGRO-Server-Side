const Purchase = require('../model/PurchaseModel');

const findPurchaseById = async (id) => {
    return await Purchase.findById(id);
};

module.exports = {
    findPurchaseById,
}