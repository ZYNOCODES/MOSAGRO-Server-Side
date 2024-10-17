const SousPurchase = require('../model/SousPurchaseModel');

const createSousPurchase = async (products, currentDateTime, session) => {
    return await SousPurchase.create([
        {
            sousStocks: products,
            date: currentDateTime
        }
    ], { session });
}
const findLastSousPurchaseByPurchase = async (id) => {
    return await SousPurchase.findOne({
        _id: id
    });
}
const findLastSousPurchaseByPurchasePopulated = async (id) => {
    return await SousPurchase.findOne({
        _id: id
    }).populate({
        path: 'sousStocks.sousStock',
        select: 'stock buying quantity',
        populate: {
            path: 'stock',
            select: 'product',
            populate: {
                path: 'product',
                select: 'name size brand boxItems',
                populate: {
                    path: 'brand',
                    select: 'name'
                }
            }
        }
    });
}

module.exports = {
    createSousPurchase, 
    findLastSousPurchaseByPurchase,
    findLastSousPurchaseByPurchasePopulated
}