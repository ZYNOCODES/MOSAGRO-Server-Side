const Receipt = require('../model/ReceiptModel');

const findReceiptById = async (id) => {
    return await Receipt.findById(id);
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

// Total payment and Total profit of all delivered receipts between store and client
const sumPaymentsForDelivredReceipts = async (storeId, clientId) => {
    const receipts = await Receipt.find({ 
        store: storeId, 
        client: clientId, 
        delivered: true, 
        credit: false, 
        status: 10 });
    return {
        total: receipts.reduce((total, receipt) => total + receipt.total, 0),
        profit: receipts.reduce((total, receipt) => total + receipt.profit, 0)
    };
};

// Total credit for all delivered receipts with credit=true between store and client
const sumCreditsForDelivredReceipts = async (storeId, clientId) => {
    const receipts = await Receipt.find({ 
        store: storeId, 
        client: clientId, 
        delivered: true, 
        credit: true, 
        status: { $ne: 10, $ne: -1 } 
    });
    return receipts.reduce((total, receipt) => {
        return total + (receipt.total - receipt.payment.reduce((sum, pay) => sum + pay.amount, 0));
    }, 0);
};

// Total unpaid amount for delivered receipts with credit=false and status=-1 between store and client
const sumAnpaidReceipts = async (storeId, clientId) => {
    const receipts = await Receipt.find({ 
        store: storeId, 
        client: clientId, 
        delivered: true, 
        credit: true,
        status: -1 
    });
    return receipts.reduce((total, receipt) => total + receipt.total, 0);
};

module.exports = {
    findReceiptById,
    findNoneDeliveredReceiptByStore,
    findCreditedReceipt,
    countReceiptsByStoreAndClient,
    sumPaymentsForDelivredReceipts,
    sumCreditsForDelivredReceipts,
    sumAnpaidReceipts
}