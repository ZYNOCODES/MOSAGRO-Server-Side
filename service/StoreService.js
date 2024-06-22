const Store = require('../model/StoreModel');

const findStoreById = async (id) => {
    return await Store.findByPk(id);
};

const findStoreByName = async (Username) => {
    return await Store.findOne({            
        username: Username
    });
};

module.exports = {
    findStoreById,
    findStoreByName,
}