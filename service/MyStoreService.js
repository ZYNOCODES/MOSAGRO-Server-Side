const MyStores = require('../model/MyStoresModel');

const findMyStoresById = async (id) => {
    return await MyStores.findById(id);
};
const findMyStoresByUser = async (userID, session) => {
    if (session)
        return await MyStores.find({
            user: userID
        }).session(session);
    else
        return await MyStores.find({
            user: userID
        });
};
//check if user is owner of store
const checkUserStore = async (userID, storeID, session) => {
    if (session)
        return await MyStores.findOne({
            user: userID,
            store: storeID,
            status: 'approved'
        }).session(session);
    else
        return await MyStores.findOne({
            user: userID,
            store: storeID,
            status: 'approved'
        });
};
module.exports = {
    findMyStoresById,
    findMyStoresByUser,
    checkUserStore
}