const Admin = require('../model/AdminModel');

const findAdminById = async (id) => {
    return await Admin.findById(id);
};

const findAdminByEmail = async (Email) => {
    return await Admin.findOne({            
        email: Email
    });
};
const findAdminByPhone = async (Phone) => {
    return await Admin.findOne({            
        phoneNumber: Phone
    });
};
module.exports = {
    findAdminById,
    findAdminByEmail,
    findAdminByPhone,
}