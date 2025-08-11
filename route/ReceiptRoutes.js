const express = require('express');
const {
    CreateReceipt,
    CreateReceiptFromStore,
    GetReceiptByID,
    GetReceiptByIDForClient,
    GetAllLatestReceiptsByStore,
    GetAllNonedeliveredReceiptsByStore,
    GetAlldeliveredReceiptsByStore,
    GetAllReturnedReceiptsByStore,
    GetAllReceiptsByClient,
    GetAllArchiveReceiptsByClient,
    ValidateMyReceipt,
    UpdateReceiptExpectedDeliveryDate,
    GetAllReceiptsByClientForStore,
    UpdateReceiptProductPrice,
    GetAlldeliveredReceiptsByStoreCredited,
    AddPaymentToReceipt,
    AddFullPaymentToReceipt,
    GetStatisticsForStoreClient,
    UpdateReceiptCredited,
    UpdateReceiptDiposit,
    updateReceiptStatus,
    CancelReceiptByClient,
    CancelReceiptByStore,
    UpdateReceiptDelivryCost
} = require('../controller/ReceiptController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthorization = require('../middleware/Authorization');
const checkStoreAccessibility = require('../middleware/CheckStoreAccessibility');
const checkClientOwnership = require('../middleware/CheckClientOwnership');
const checkStoreOwnership = require('../middleware/CheckStoreOwnership');
const checkSubscription = require('../middleware/CheckSubscription');

//secure routes below
router.use(requireAuth);
router.use(checkSubscription);

// STORE_API routes
//get specific receipt
router.get('/:id/:store', checkAuthorization([process.env.STORE_TYPE]), checkStoreOwnership, GetReceiptByID);
//get all delivered receipts
router.get('/delivred/all/:store', checkAuthorization([process.env.STORE_TYPE]), checkStoreOwnership, GetAlldeliveredReceiptsByStore);
//get all latest receipts
router.get('/latest/all/:store', checkAuthorization([process.env.STORE_TYPE]), checkStoreOwnership, GetAllLatestReceiptsByStore);
//get all none delivered receipts
router.get('/noneDelivred/all/:store', checkAuthorization([process.env.STORE_TYPE]), checkStoreOwnership, GetAllNonedeliveredReceiptsByStore);
//get all delivered receipts credited
router.get('/delivredCredited/all/:store', checkAuthorization([process.env.STORE_TYPE]), checkStoreOwnership, GetAlldeliveredReceiptsByStoreCredited);
//get all returned receipts
router.get('/returned/all/:store', checkAuthorization([process.env.STORE_TYPE]), checkStoreOwnership, GetAllReturnedReceiptsByStore);
//get all receipts by client for store
router.get('/clientForStore/:client/:store', checkAuthorization([process.env.STORE_TYPE]), checkStoreOwnership, GetAllReceiptsByClientForStore);
//update expected delivery date
router.patch('/updateExpectedDeliveryDate/:id/:store', checkAuthorization([process.env.STORE_TYPE]), checkStoreOwnership, UpdateReceiptExpectedDeliveryDate);
//update expected delivery cost
router.patch('/updateExpectedDeliveryCost/:id/:store', checkAuthorization([process.env.STORE_TYPE]), checkStoreOwnership, UpdateReceiptDelivryCost);
//update product price
router.patch('/updateProductPrice/:store', checkAuthorization([process.env.STORE_TYPE]), checkStoreOwnership, UpdateReceiptProductPrice);
//add payment to receipt credit
router.patch('/payment/:id/:store', checkAuthorization([process.env.STORE_TYPE]), checkStoreOwnership, AddPaymentToReceipt);
//add payment to receipt credit
router.patch('/full/payment/:id/:store', checkAuthorization([process.env.STORE_TYPE]), checkStoreOwnership, AddFullPaymentToReceipt);
//create new receipt from store
router.post('/store/:store', checkAuthorization([process.env.STORE_TYPE]), checkStoreOwnership, CreateReceiptFromStore);
// Getting statistics for a specific store and client
router.get('/statistics/:store/:client', checkAuthorization([process.env.STORE_TYPE]), checkStoreOwnership, GetStatisticsForStoreClient);
// update receipt deposit
router.patch('/deposit/:id/:store', checkAuthorization([process.env.STORE_TYPE]), checkStoreOwnership, UpdateReceiptDiposit);
// mupdate receipt credit
router.patch('/credit/:id/:store', checkAuthorization([process.env.STORE_TYPE]), checkStoreOwnership, UpdateReceiptCredited);
// update receipt status
router.patch('/status/:store', checkAuthorization([process.env.STORE_TYPE]), checkStoreOwnership, updateReceiptStatus);
// cancel receipt by store
router.patch('/cancel/:store/:id', checkAuthorization([process.env.STORE_TYPE]), checkStoreOwnership, CancelReceiptByStore);

// Client_API routes
//create new receipt
router.post('/:client/:store', checkAuthorization([process.env.CLIENT_TYPE]), checkStoreAccessibility, CreateReceipt);
//get all receipts by client
router.get('/client/all/:id', checkAuthorization([process.env.CLIENT_TYPE]), checkClientOwnership, GetAllReceiptsByClient);
//get all archive receipts by client
router.get('/client/archive/:id', checkAuthorization([process.env.CLIENT_TYPE]), checkClientOwnership, GetAllArchiveReceiptsByClient);
//get specific receipt for client
router.get('/client/:id/:receipt', checkAuthorization([process.env.CLIENT_TYPE]), checkClientOwnership, GetReceiptByIDForClient);
//validate receipt
router.patch('/validate/:id', checkAuthorization([process.env.CLIENT_TYPE]), checkClientOwnership, ValidateMyReceipt);
// cancel receipt by client
router.patch('/cancel/:id/:receipt', checkAuthorization([process.env.CLIENT_TYPE]), checkClientOwnership, CancelReceiptByClient);

module.exports = router;