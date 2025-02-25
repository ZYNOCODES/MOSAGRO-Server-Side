const Receipt = require('../model/ReceiptModel');

const findReceiptById = async (id) => {
    return await Receipt.findById(id);
};
const findReceiptByIdAndStore = async (id, store) => {
    return await Receipt.findOne({
        _id: id,
        store: store
    });
};
const findReceiptByIdAndClient = async (id, client) => {
    return await Receipt.findOne({
        _id: id,
        client: client
    });
};
const findNoneDeliveredReceiptByStore = async (store, id, session) => {
    if (session) 
        return await Receipt.findOne({
            _id: id,
            store: store,
            delivered: false
        }).session(session);
    else
        return await Receipt.findOne({
            _id: id,
            store: store,
            delivered: false
        });
}
const findCreditedReceipt = async (id) => {
    return await Receipt.findOne({
        _id: id,
        credit: true
    });
}
// Function to count the number of receipts between a store and a client
const countReceiptsByStoreAndClient = async (storeId, clientId) => {
    return await Receipt.countDocuments({
        store: storeId,
        client: clientId
    });
};

// Total payment and Total profit of receipts between store and client
const sumPaymentsForAllReceipts = async (storeId, clientId) => {
    const receipts = await Receipt.find({ 
        store: storeId, 
        client: clientId, 
    });
    return {
        total: receipts.reduce((total, receipt) => total + receipt.total, 0),
        profit: receipts.reduce((total, receipt) => total + receipt.profit, 0)
    };
};

// Total paid payment receipts between store and client
const sumPaidPaymentsForAllReceipts = async (storeId, clientId) => {
    const receipts = await Receipt.find({ 
        store: storeId, 
        client: clientId,
    });
    return receipts.reduce((total, receipt) => {
        return total + (receipt.payment.reduce((sum, pay) => sum + pay.amount, 0));
    }, 0);
};

// Total credit and unpaid receipts between store and client
const sumCreditsAndUnpaidReceipts = async (storeId, clientId) => {
    // Fetch all relevant receipts between store and client
    const receipts = await Receipt.find({ 
        store: storeId, 
        client: clientId, 
    });

    // Calculate the total credit and total unpaid amounts
    const result = receipts.reduce((acc, receipt) => {
        if (receipt.credit === true && receipt.deposit === false && receipt.status != 10) {
            const unpaidAmount = receipt.total - receipt.payment.reduce((sum, pay) => sum + pay.amount, 0);
            acc.totalCredit += unpaidAmount;
        }

        
        if (receipt.deposit === true && receipt.credit === false && receipt.status != 10) {
            acc.totalUnpaid += receipt.total;
        }

        
        if (receipt.delivered === false && receipt.credit === false && receipt.deposit === false && receipt.status != 10) {
            acc.totalInProgress += receipt.total;
        }

        return acc;
    }, { totalCredit: 0, totalUnpaid: 0, totalInProgress: 0 });

    // Return the sum of totalCredit and totalUnpaid
    return result.totalCredit + result.totalUnpaid + result.totalInProgress;
};

module.exports = {
    findReceiptById,
    findReceiptByIdAndStore,
    findReceiptByIdAndClient,
    findNoneDeliveredReceiptByStore,
    findCreditedReceipt,
    countReceiptsByStoreAndClient,
    sumPaymentsForAllReceipts,
    sumPaidPaymentsForAllReceipts,
    sumCreditsAndUnpaidReceipts
}