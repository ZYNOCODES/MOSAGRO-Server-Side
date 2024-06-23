const Store = require('../model/StoreModel');

const findStoreById = async (id) => {
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
module.exports = {
    findStoreById,
    findStoreByEmail,
    findStoreByPhone,
}