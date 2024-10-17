const StockStatus = require('../model/StockStatusModel');
const StockService = require('../service/StockService');

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
const updateSousStocks = async (sousStocks, session) => {
    const updatedSousStocks = await Promise.all(sousStocks.map(async (sousStock) => {
        const existingSousStock = await StockStatus.findById(sousStock.sousStock);
        if (!existingSousStock) {
            return false;
        }
        const existingStock = await StockService.findStockById(existingSousStock.stock);
        if (!existingStock) {
            return false;
        }

        // Calculate new quantity
        const adjustedQuantity = parseFloat(sousStock.quantity);
        const substractedQuantity = parseFloat(existingSousStock.quantity) - adjustedQuantity;

        // Update sous stock with new quantity and price
        existingSousStock.quantity = adjustedQuantity;

        // Calculate new stock quantity and update stock
        existingStock.quantity -= substractedQuantity;

        // Save the updated sous stock
        await existingSousStock.save({ session });
        //Save the updated stock quantity
        await existingStock.save({ session });

        return true; 
    }));

    // Check if any sous stock was updated
    if (!updatedSousStocks || updatedSousStocks.length <= 0 || updatedSousStocks.includes(false)) {
        return false;
    }

    return true;
};

module.exports = {
    findStockStatusById,
    createStockStatus, 
    updateSousStocks
}