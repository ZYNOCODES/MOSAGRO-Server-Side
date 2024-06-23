const User = require('../model/UserModel');

const findUserById = async (id) => {
    return await User.findById(id);
};

const findUserByEmail = async (Email) => {
    return await User.findOne({            
        email: Email
    });
};
const findUserByPhone = async (Phone) => {
    return await User.findOne({            
        phoneNumber: Phone
    });
};
module.exports = {
    findUserById,
    findUserByEmail,
    findUserByPhone,
}