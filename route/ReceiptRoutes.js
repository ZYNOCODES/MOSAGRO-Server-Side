const express = require('express');
const {
    CreateReceipt,
    CreateReceiptFromStore,
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
router.get('/:id', checkAuthrozation([process.env.STORE_TYPE]), GetReceiptByID);
//get all delivered receipts
router.get('/delivred/:id', checkAuthrozation([process.env.STORE_TYPE]), GetAlldeliveredReceiptsByStore);
//get all none delivered receipts
router.get('/noneDelivred/:id', checkAuthrozation([process.env.STORE_TYPE]), GetAllNonedeliveredReceiptsByStore);
//get all delivered receipts credited
router.get('/delivredCredited/:id', checkAuthrozation([process.env.STORE_TYPE]), GetAlldeliveredReceiptsByStoreCredited);
//get all receipts by client for store
router.get('/clientForStore/:client/:store', checkAuthrozation([process.env.STORE_TYPE]), GetAllReceiptsByClientForStore);
//validate receipt
router.patch('/validate/:id', checkAuthrozation([process.env.STORE_TYPE]), ValidateMyReceipt);
//delete receipt
router.delete('/:id', checkAuthrozation([process.env.STORE_TYPE]), DeleteReceipt);
//update expected delivery date
router.patch('/updateExpectedDeliveryDate/:id', checkAuthrozation([process.env.STORE_TYPE]), UpdateReceiptExpextedDeliveryDate);
//update product price
router.patch('/updateProductPrice/:store', checkAuthrozation([process.env.STORE_TYPE]), UpdateReceiptProductPrice);
//add payment to receipt credit
router.patch('/addPaymentToCredit/:id', checkAuthrozation([process.env.STORE_TYPE]), AddPaumentToCreditReceipt);
//create new receipt from store
router.post('/store/:store', checkAuthrozation([process.env.STORE_TYPE]), CreateReceiptFromStore);

// Client_API routes
//create new receipt
router.post('/:client', checkAuthrozation([process.env.CLIENT_TYPE]), CreateReceipt);
//get all receipts by client
router.get('/client/:id', checkAuthrozation([process.env.CLIENT_TYPE]), GetAllReceiptsByClient);


module.exports = router;