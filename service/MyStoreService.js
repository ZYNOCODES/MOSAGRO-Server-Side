const MyStores = require('../model/MyStoresModel');

const findMyStoresById = async (id) => {
    return await MyStores.findById(id);
};
const findMyStoresByUser = async (userID) => {
    return await MyStores.findOne({
        user: userID
    });
};
module.exports = {
    findMyStoresById,
    findMyStoresByUser
}