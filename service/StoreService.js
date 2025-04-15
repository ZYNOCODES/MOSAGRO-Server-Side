const Store = require('../model/StoreModel');

const findStoreById = async (id, session) => {
    if (session) 
        return await Store.findById(id).session(session);
    else
        return await Store.findById(id);
};

const findStoreByEmail = async (Email) => {
    return await Store.findOne({            
        email: Email
    });
};
const findStoreByPhone = async (Phone) => {
    return await Store.findOne({            
        phoneNumber: Phone
    });
};
const findStoresByCategory = async (categoryId, options = {}) => {
    return await Store.find(
        { categories: { $in: [categoryId] } },
        {},
        { session: options.session }
    );
};
module.exports = {
    findStoreById,
    findStoreByEmail,
    findStoreByPhone,
    findStoresByCategory
}