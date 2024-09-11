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

const sumCreditsAndUnpaidReceipts = async (storeId, clientId) => {
    // Fetch all relevant receipts between store and client
    const receipts = await Receipt.find({ 
        store: storeId, 
        client: clientId, 
    });

    // Calculate the total credit and total unpaid amounts
    const result = receipts.reduce((acc, receipt) => {
        // If receipt has credit=true and status is neither -1 nor 10 (valid credit receipts)
        if (receipt.delivered === true && receipt.credit === true && receipt.status !== -1 && receipt.status !== 10) {
            const unpaidAmount = receipt.total - receipt.payment.reduce((sum, pay) => sum + pay.amount, 0);
            acc.totalCredit += unpaidAmount;
        }

        // If receipt has credit=false and status=-1 (unpaid receipts)
        if (receipt.delivered === true && receipt.credit === true && receipt.status === -1) {
            acc.totalUnpaid += receipt.total;
        }

        // if receipt has credit=false and status!=10 and status!=-1 (valid receipts)
        if (receipt.delivered === false && receipt.credit === false && receipt.status !== 10 && receipt.status !== -1) {
            acc.totalInProgress += receipt.total;
        }

        return acc;
    }, { totalCredit: 0, totalUnpaid: 0, totalInProgress: 0 });

    // Return the sum of totalCredit and totalUnpaid
    return result.totalCredit + result.totalUnpaid + result.totalInProgress;
};

module.exports = {
    findReceiptById,
    findNoneDeliveredReceiptByStore,
    findCreditedReceipt,
    countReceiptsByStoreAndClient,
    sumPaymentsForAllReceipts,
    sumPaidPaymentsForAllReceipts,
    sumCreditsAndUnpaidReceipts
}