const StockStatus = require('../model/StockStatusModel');

const findStockStatusById = async (id) => {
    return await StockStatus.findById(id);
}
const createStockStatus = async (date, stock, buying, selling, quantity, exparationDate, session) => {
    return await StockStatus.create([{
        stock,
        date,
        buying,
        selling,
        quantity,
        exparationDate: exparationDate ? exparationDate : '',
    }], { session });
}

module.exports = {
    findStockStatusById,
    createStockStatus, 
}