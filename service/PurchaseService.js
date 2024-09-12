const { trusted } = require('mongoose');
const Purchase = require('../model/PurchaseModel');

const findPurchaseById = async (id) => {
    return await Purchase.findById(id);
};
const findPurchaseByIdAndStore = async (id, store) => {
    return await Purchase.findOne({
        _id: id, 
        store: store
    });
};
// Count all Purchases between store and fournisseur
const countPurchasesByStoreAndFournisseur = async (storeId, fournisseurId) => {
    return await Purchase.countDocuments({ store: storeId, fournisseur: fournisseurId });
};

// Total payment of all closed purchases between store and fournisseur
const sumAmountsForAllPurchases = async (storeId, fournisseurId) => {
    const purchases = await Purchase.find({ 
        store: storeId, 
        fournisseur: fournisseurId, 
    });
    return purchases.reduce((total, purchase) => {
        return total + purchase.totalAmount;
    }, 0);
};

// Total amount of all non-closed and non-credited purchases
const sumPaymentsForAllPurchases = async (storeId, fournisseurId) => {
    const purchases = await Purchase.find({ 
        store: storeId, 
        fournisseur: fournisseurId, 
    });
    return purchases.reduce((total, purchase) => {
        return total + purchase.payment.reduce((sum, pay) => sum + pay.amount, 0);
    }, 0);
};

// Total payment of all non-closed and credited purchases
const sumPaymentsForCreditedUnpaidPurchases = async (storeId, fournisseurId) => {
    const purchases = await Purchase.find({ 
        store: storeId, 
        fournisseur: fournisseurId, 
        closed: false,
    });

    // Calculate the total credit and total unpaid amounts
    const result = purchases.reduce((acc, purchase) => {
        if (purchase.credit === true && (purchase.deposit === false || purchase.deposit === true)) {
            const unpaidAmount = purchase.totalAmount - purchase.payment.reduce((sum, pay) => sum + pay.amount, 0);
            acc.totalCredit += unpaidAmount;
        }

        
        if (purchase.deposit === true && purchase.credit === false) {
            acc.totalDepositUncredited += purchase.totalAmount;
        }

        
        if (purchase.credit === false && purchase.deposit === false) {
            acc.totalInProgress += purchase.totalAmount;
        }

        return acc;
    }, { totalCredit: 0, totalDepositUncredited : 0, totalInProgress: 0 });

    // Return the sum of totalCredit and totalUnpaid
    return result.totalCredit + result.totalDepositUncredited  + result.totalInProgress;
};



module.exports = {
    findPurchaseById,
    findPurchaseByIdAndStore,
    countPurchasesByStoreAndFournisseur,
    sumAmountsForAllPurchases,
    sumPaymentsForAllPurchases,
    sumPaymentsForCreditedUnpaidPurchases
}