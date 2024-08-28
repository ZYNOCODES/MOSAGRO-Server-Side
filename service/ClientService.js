const Client = require('../model/UserModel');

const findClientById = async (id) => {
    return await Client.findById(id);
};

module.exports = {
    findClientById,
}