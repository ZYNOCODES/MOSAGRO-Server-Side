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
const findProfuctByNameSizeBrand = async (Name, Size, Brand) => {
    return await Product.findOne({            
        name: Name,
        size: Size,
        brand: Brand
    });
}
const findProductByBrand = async (Brand) => {
    return await Product.findOne({            
        brand: Brand
    });
}

const findProductByCategory = async (Category) => {
    return await Product.findOne({            
        category: Category
    });
}
module.exports = {
    findProductById,
    findProductByName,
    findProductByCode,
    findProfuctByNameSizeBrand,
    findProductByBrand,
    findProductByCategory
}