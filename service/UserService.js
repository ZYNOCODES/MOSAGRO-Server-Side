const User = require('../model/UserModel');

const findUserById = async (id) => {
    return await User.findByPk(id);
};

const findUserByName = async (Username) => {
    return await User.findOne({            
        username: Username
    });
};

module.exports = {
    findUserById,
    findUserByName,
}