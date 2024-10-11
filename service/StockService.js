const Stock = require('../model/StockModel');

const findStockById = async (id, session) => {
    if (!session) 
        return await Stock.findById(id);
    else
        return await Stock.findById(id).session(session);
};

const findStockByStoreAndProduct = async (Store, Product) => {
    return await Stock.findOne({            
        store: Store,
        product: Product
    });
};
const findStockByStore = async (store) => {
    return await Stock.find({            
        store: store
    });
};
const findStockByID_IDStore = async (id, store, session) => {
    return await Stock.findOne({
        _id: id,     
        store: store
    }).session(session);
};
const createNewStock = async (product, store, session) => {
    return await Stock.create([{
        product: product.productID,
        store: store,
        quantity: product.newQuantity,
        buying: product.buying,
        selling: product.selling,
    }], { session });
}

const findStockByProduct = async (product) => {
    return await Stock.findOne({            
        product: product
    });
}
module.exports = {
    findStockById,
    findStockByStoreAndProduct,
    findStockByStore,
    findStockByID_IDStore,
    createNewStock,
    findStockByProduct
}