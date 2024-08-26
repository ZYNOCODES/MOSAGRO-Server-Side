const StockStatus = require('../model/StockStatusModel');

const findStockStatusById = async (id, session) => {
    return await StockStatus.findById(id).session(session);
}
const createStockStatus = async (stock, buying, selling, quantity, exparationDate, session) => {
    return await StockStatus.create([{
        stock,
        status: [{
            buying,
            selling,
            quantity,
            exparationDate,
            end: false
        }]
    }], { session });
}
//add status to stock
const addStatus = async (stock, buying, selling, quantity, exparationDate, session) => {
    return await StockStatus.findOneAndUpdate({stock: stock}, {
        $push: {
            status: {
                buying,
                selling,
                quantity,
                exparationDate,
                end: false
            }
        }
    }, { session });
}
module.exports = {
    findStockStatusById,
    createStockStatus, 
    addStatus
}