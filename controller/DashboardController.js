const mongoose = require('mongoose');
const Receipt = require('../model/ReceiptModel.js');
const Stock = require('../model/StockModel.js');
const MyStores = require('../model/MyStoresModel.js');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const moment = require('moment');
const UtilMoment = require('../util/Moment.js');

// get today orders stats by store
const getTodayOrdersStatsByStore = asyncErrorHandler(async (req, res) => {
    const { store } = req.params;
    const today = UtilMoment.getCurrentDateTime().startOf('day');
    const tomorrow = UtilMoment.getCurrentDateTime().endOf('day');
    // get all receipts for today select only the total amount and profit
    const existingReceipts = await Receipt.find({
        store,
        createdAt: { $gte: today, $lt: tomorrow }
    }).select('total profit');
    
    res.status(200).json({
        totalReceipts: existingReceipts.length,
        totalAmount: existingReceipts.reduce((acc, receipt) => acc + receipt.total, 0),
        totalProfit: existingReceipts.reduce((acc, receipt) => acc + receipt.profit, 0)
    });
});
// get orders stats between two dates
const getOrdersStatsByStore = asyncErrorHandler(async (req, res) => {
    const { store } = req.params;
    const { startDate, endDate } = req.query;
    // check if the dates are valid
    if (!startDate || !endDate) {
        return { 
            totalReceipts: 0,
            totalAmount: 0,
            totalProfit: 0
        }
    }
    
    const start = moment(new Date(startDate).toISOString()).startOf('day');
    const end = moment(new Date(endDate).toISOString()).endOf('day');

    // get all receipts for today select only the total amount and profit
    const existingReceipts = await Receipt.find({
        store,
        createdAt: { $gte: start, $lt: end }
    }).select('total profit');
    
    res.status(200).json({
        totalReceipts: existingReceipts.length,
        totalAmount: existingReceipts.reduce((acc, receipt) => acc + receipt.total, 0),
        totalProfit: existingReceipts.reduce((acc, receipt) => acc + receipt.profit, 0)
    });
});
// get top Selling stocks by store
const getTopSellingStocksByStore = asyncErrorHandler(async (req, res) => {
    const { store } = req.params;
    // Retrieve all receipts for the specific store
    const receipts = await Receipt.find({ store }).populate({
        path: 'products',
        select: 'stock product',
        populate: {
            path: 'products',
            select: 'stock',
            populate: {
                path: 'stock',
                select: 'quantity quantityLimit',
                populate: {
                    path: 'product',
                    select: 'name size brand image',
                    populate: {
                        path: 'brand',
                        select: 'name'
                    }
                },
            }
        }
    });

    // xtract the last receiptStatus for each receipt
    const stockQuantities = {};

    receipts.forEach(receipt => {
        if (receipt.products.length > 0) {
            const lastReceiptStatus = receipt.products[receipt.products.length - 1];

            // Count the repetitions of each stock in the last receiptStatus
            lastReceiptStatus.products.forEach(product => {
                const stockId = product.stock._id.toString();
                if (!stockQuantities[stockId]) {
                    stockQuantities[stockId] = {
                        stock: product.stock,
                        totalQuantity: 0
                    };
                }
                stockQuantities[stockId].totalQuantity += product.quantity;
            });
        }
    });

    // Sort the stocks by their repetition count in descending order
    const sortedStocks = Object.values(stockQuantities).sort((a, b) => b.totalQuantity - a.totalQuantity);

    // Limit the results to the top 6 stocks
    const top10Stocks = sortedStocks.slice(0, 10);

    res.status(200).json(top10Stocks);
});
// get stats by store  
const getStatsByStore = asyncErrorHandler(async (req, res) => {
    const { store } = req.params;
    // count total stocks in the store
    const totalStocks = await Stock.countDocuments({ store });
    // count total receipts in the store
    const totalReceipts = await Receipt.countDocuments({ store });
    // count customers in the store
    const totalCustomers = await MyStores.countDocuments({ store, isSeller: false, status: 'approved' });
    // count sellers in the store
    const totalSellers = await MyStores.countDocuments({ store, isSeller: true, status: 'approved' });
    
    res.status(200).json({
        totalStocks,
        totalReceipts,
        totalCustomers,
        totalSellers
    });
});
//get last new access customers by store
const getLastNewAccessCustomersByStore = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    // get last 5 new access customers
    const newCustomers = await MyStores.find({ store, isSeller: false, status: 'pending' })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate({
            path: 'user',
            select: 'firstName lastName phoneNumber'
        });
    //check if there are new customers
    if (newCustomers.length <= 0) {
        return next(new CustomError('No new customers found', 404));
    }
    res.status(200).json(newCustomers);
});
//get the stocks that are about to finish their quantity by store
const getStocksAboutToFinishByStore = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    // get all stocks that are about to finish their quantity
    const stocks = await Stock.find({
        store,
        $or: [
            { quantity: { $lte: 10 } }, 
            { $expr: { $eq: ["$quantity", "$destocking"] } }
        ]
    }).populate({
        path: 'product',
        select: 'name size brand image',
        populate: {
            path: 'brand',
            select: 'name'
        }
    });
    //check if there are stocks about to finish
    if (stocks.length <= 0) {
        return next(new CustomError('No stocks about to finish found', 404));
    }
    res.status(200).json(stocks);
});
//get total profit daily
const getTotalProfitDailyByStore = asyncErrorHandler(async (req, res) => {
    const { store } = req.params;
    const today = UtilMoment.getCurrentDateTime().startOf('day').toDate();
    const tomorrow = UtilMoment.getCurrentDateTime().endOf('day').toDate();
    const storeId = mongoose.isValidObjectId(store) ? new mongoose.Types.ObjectId(store) : store;

    // Aggregate daily profits
    const profits = await Receipt.aggregate([
        {
            $match: {
                store : storeId,
                createdAt: { $gte: today, $lt: tomorrow }
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                totalProfit: { $sum: '$profit' }
            }
        },
        {
            $sort: { _id: 1 }
        }
    ]);
    
    res.status(200).json(profits);
});
//get total profit weekly
const getTotalProfitWeeklyByStore = asyncErrorHandler(async (req, res) => {
    const { store } = req.params;
    const today = UtilMoment.getCurrentDateTime().startOf('month').toDate();
    const tomorrow = UtilMoment.getCurrentDateTime().endOf('month').toDate();
    const storeId = mongoose.isValidObjectId(store) ? new mongoose.Types.ObjectId(store) : store;

    // Aggregate monthly profits
    const profits = await Receipt.aggregate([
        {
            $match: {
                store : storeId,
                createdAt: { $gte: today, $lt: tomorrow }
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                totalProfit: { $sum: '$profit' }
            }
        },
        {
            $sort: { _id: 1 }
        }
    ]);
    
    res.status(200).json(profits);
});
//get total profit monthly
const getTotalProfitMonthlyByStore = asyncErrorHandler(async (req, res) => {
    const { store } = req.params;
    const today = UtilMoment.getCurrentDateTime().startOf('year').toDate();
    const tomorrow = UtilMoment.getCurrentDateTime().endOf('year').toDate();
    const storeId = mongoose.isValidObjectId(store) ? new mongoose.Types.ObjectId(store) : store;

    // Aggregate yearly profits
    const profits = await Receipt.aggregate([
        {
            $match: {
                store : storeId,
                createdAt: { $gte: today, $lt: tomorrow }
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
                totalProfit: { $sum: '$profit' }
            }
        },
        {
            $sort: { _id: 1 }
        }
    ]);
    
    res.status(200).json(profits);
});
//get total profit yearly
const getTotalProfitYearlyByStore = asyncErrorHandler(async (req, res) => {
    const { store } = req.params;
    const today = UtilMoment.getCurrentDateTime().toDate();
    const fiveYearsAgo  = UtilMoment.getCurrentDateTime().toDate();
    fiveYearsAgo.setFullYear(today.getFullYear() - 5);
    const storeId = mongoose.isValidObjectId(store) ? new mongoose.Types.ObjectId(store) : store;

    // Aggregate yearly profits
    const profits = await Receipt.aggregate([
        {
            $match: { 
                store: storeId,
                createdAt: { $gte: fiveYearsAgo }
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y', date: '$createdAt' } },
                totalProfit: { $sum: '$profit' }
            }
        },
        {
            $sort: { _id: 1 }
        }
    ]);
    
    res.status(200).json(profits);
});

module.exports = {
    getTodayOrdersStatsByStore,
    getOrdersStatsByStore,
    getTopSellingStocksByStore,
    getStatsByStore,
    getLastNewAccessCustomersByStore,
    getStocksAboutToFinishByStore,
    getTotalProfitDailyByStore,
    getTotalProfitWeeklyByStore,
    getTotalProfitMonthlyByStore,
    getTotalProfitYearlyByStore
}