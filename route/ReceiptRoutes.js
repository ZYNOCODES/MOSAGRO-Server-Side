const express = require('express');
const {
    CreateReceipt,
    GetReceiptByID,
    GetAllNonedeliveredReceiptsByStore,
    GetAlldeliveredReceiptsByStore,
    GetAllReceiptsByClient,
    ValidateMyReceipt,
    UpdateReceiptExpextedDeliveryDate,
    DeleteReceipt,
    GetAllReceiptsByClientForStore,
    UpdateReceiptProductPrice,
    GetAlldeliveredReceiptsByStoreCredited,
    AddPaumentToCreditReceipt
} = require('../controller/ReceiptController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');

//secure routes below
router.use(requireAuth);

// STORE_API routes
//get specific receipt
router.get('/:id', checkAuthrozation('STORE_API'), GetReceiptByID);
//get all delivered receipts
router.get('/delivred/:id', checkAuthrozation('STORE_API'), GetAlldeliveredReceiptsByStore);
//get all none delivered receipts
router.get('/noneDelivred/:id', checkAuthrozation('STORE_API'), GetAllNonedeliveredReceiptsByStore);
//get all delivered receipts credited
router.get('/delivredCredited/:id', checkAuthrozation('STORE_API'), GetAlldeliveredReceiptsByStoreCredited);
//get all receipts by client for store
router.get('/clientForStore/:client/:store', checkAuthrozation('STORE_API'), GetAllReceiptsByClientForStore);
//validate receipt
router.patch('/validate/:id', checkAuthrozation('STORE_API'), ValidateMyReceipt);
//delete receipt
router.delete('/:id', checkAuthrozation('STORE_API'), DeleteReceipt);
//update expected delivery date
router.patch('/updateExpectedDeliveryDate/:id', checkAuthrozation('STORE_API'), UpdateReceiptExpextedDeliveryDate);
//update product price
router.patch('/updateProductPrice/:store', checkAuthrozation('STORE_API'), UpdateReceiptProductPrice);
//add payment to receipt credit
router.patch('/addPaymentToCredit/:id', checkAuthrozation('STORE_API'), AddPaumentToCreditReceipt);
//get all receipts by client
router.get('/client/:id', checkAuthrozation('STORE_API'), GetAllReceiptsByClient);
// Client_API routes
//create new receipt
router.post('/:client', checkAuthrozation('CLIENT_API'), CreateReceipt);


module.exports = router;