const Product = require('../model/ProductModel');

const findProductById = async (id) => {
    return await Product.findById(id);
};

const findProductByName = async (Name) => {
    return await Product.findOne({            
        name: Name
    });
};
const findProductByCode = async (Code) => {
    return await Product.findOne({            
        code: Code
    });
};
module.exports = {
    findProductById,
    findProductByName,
    findProductByCode,
}