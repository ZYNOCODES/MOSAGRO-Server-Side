const express = require('express');
const {
    CreateReceipt,
    CreateReceiptFromStore,
    GetReceiptByID,
    GetReceiptByIDForClient,
    GetAllNonedeliveredReceiptsByStore,
    GetAlldeliveredReceiptsByStore,
    GetAllReturnedReceiptsByStore,
    GetAllReceiptsByClient,
    GetAllArchiveReceiptsByClient,
    ValidateMyReceipt,
    UpdateReceiptExpextedDeliveryDate,
    DeleteReceipt,
    GetAllReceiptsByClientForStore,
    UpdateReceiptProductPrice,
    GetAlldeliveredReceiptsByStoreCredited,
    AddPaymentToReceipt,
    AddFullPaymentToReceipt,
    GetStatisticsForStoreClient,
    UpdateReceiptCredited,
    UpdateReceiptDiposit,
    updateReceiptStatus
} = require('../controller/ReceiptController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');
const checkStoreAccessibility = require('../middleware/CheckStoreAccessibility');
const checkClientOwnership = require('../middleware/CheckClientOwnership');
const checkStoreOwnership = require('../middleware/CheckStoreOwnership');
const checkSubscription = require('../middleware/CheckSubscription');

//secure routes below
router.use(requireAuth);
router.use(checkSubscription);

// STORE_API routes
//get specific receipt
router.get('/:id', checkAuthrozation([process.env.STORE_TYPE]), GetReceiptByID);
//get all delivered receipts
router.get('/delivred/:id', checkAuthrozation([process.env.STORE_TYPE]), GetAlldeliveredReceiptsByStore);
//get all none delivered receipts
router.get('/noneDelivred/:id', checkAuthrozation([process.env.STORE_TYPE]), GetAllNonedeliveredReceiptsByStore);
//get all delivered receipts credited
router.get('/delivredCredited/:id', checkAuthrozation([process.env.STORE_TYPE]), GetAlldeliveredReceiptsByStoreCredited);
//get all returned receipts
router.get('/returned/:id', checkAuthrozation([process.env.STORE_TYPE]), GetAllReturnedReceiptsByStore);
//get all receipts by client for store
router.get('/clientForStore/:client/:store', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, GetAllReceiptsByClientForStore);
//delete receipt
router.delete('/:id', checkAuthrozation([process.env.STORE_TYPE]), DeleteReceipt);
//update expected delivery date
router.patch('/updateExpectedDeliveryDate/:id', checkAuthrozation([process.env.STORE_TYPE]), UpdateReceiptExpextedDeliveryDate);
//update product price
router.patch('/updateProductPrice/:store', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, UpdateReceiptProductPrice);
//add payment to receipt credit
router.patch('/payment/:id', checkAuthrozation([process.env.STORE_TYPE]), AddPaymentToReceipt);
//add payment to receipt credit
router.patch('/full/payment/:id', checkAuthrozation([process.env.STORE_TYPE]), AddFullPaymentToReceipt);
//create new receipt from store
router.post('/store/:store', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, CreateReceiptFromStore);
// Getting statistics for a specific store and client
router.get('/statistics/:store/:client', checkAuthrozation([process.env.STORE_TYPE]), GetStatisticsForStoreClient);
// update receipt deposit
router.patch('/deposit/:id', checkAuthrozation([process.env.STORE_TYPE]), UpdateReceiptDiposit);
// mupdate receipt credit
router.patch('/credit/:id', checkAuthrozation([process.env.STORE_TYPE]), UpdateReceiptCredited);
// update receipt status
router.patch('/status/:store', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, updateReceiptStatus);

// Client_API routes
//create new receipt
router.post('/:client/:store', checkAuthrozation([process.env.CLIENT_TYPE]), checkStoreAccessibility, CreateReceipt);
//get all receipts by client
router.get('/client/:id', checkAuthrozation([process.env.CLIENT_TYPE]), checkClientOwnership, GetAllReceiptsByClient);
//get all archive receipts by client
router.get('/client/archive/:id', checkAuthrozation([process.env.CLIENT_TYPE]), checkClientOwnership, GetAllArchiveReceiptsByClient);
//get specific receipt for client
router.get('/client/:id/:receipt', checkAuthrozation([process.env.CLIENT_TYPE]), checkClientOwnership, GetReceiptByIDForClient);
//validate receipt
router.patch('/validate/:id', checkAuthrozation([process.env.CLIENT_TYPE]), checkClientOwnership, ValidateMyReceipt);

module.exports = router;