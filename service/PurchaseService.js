const Purchase = require('../model/PurchaseModel');

const findPurchaseById = async (id) => {
    return await Purchase.findById(id);
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
        credit: true
    });

    return purchases.reduce((total, purchase) => {
        return total + (purchase.totalAmount - purchase.payment.reduce((sum, pay) => sum + pay.amount, 0));
    }, 0);
};



module.exports = {
    findPurchaseById,
    countPurchasesByStoreAndFournisseur,
    sumAmountsForAllPurchases,
    sumPaymentsForAllPurchases,
    sumPaymentsForCreditedUnpaidPurchases
}