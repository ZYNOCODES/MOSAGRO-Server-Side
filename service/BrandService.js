const Brand = require('../model/BrandModel');

const findBrandById = async (id) => {
    return await Brand.findById(id);
};

const findBrandByName = async (Name) => {
    return await Brand.findOne({            
        name: Name
    });
};
const findBrandByCode = async (Code) => {
    return await Brand.findOne({            
        code: Code
    });
};

module.exports = {
    findBrandById,
    findBrandByName,
    findBrandByCode,
}