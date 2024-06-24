const Stock = require('../model/StockModel');

const findStockById = async (id) => {
    return await Stock.findById(id);
};

const findStockByStoreAndProduct = async (Store, Product) => {
    return await Stock.findOne({            
        store: Store,
        product: Product
    });
};
const findStockByStore = async (Product) => {
    return await Stock.findOne({            
        product: Product
    });
};
module.exports = {
    findStockById,
    findStockByStoreAndProduct,
    findStockByStore,
}