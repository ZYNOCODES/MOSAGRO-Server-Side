const Admin = require('../model/AdminModel');

const findAdminById = async (id) => {
    return await Admin.findByPk(id);
};

const findAdminByName = async (Username) => {
    return await Admin.findOne({            
        username: Username
    });
};

module.exports = {
    findAdminById,
    findAdminByName,
}