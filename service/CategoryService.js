const Category = require('../model/CategoryModel');

const findCategoryById = async (id) => {
    return await Category.findById(id);
};

const findCategoryByName = async (Name) => {
    return await Category.findOne({            
        name: Name
    });
};

module.exports = {
    findCategoryById,
    findCategoryByName,
}