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
    GetAllReceiptsByClientForStore
} = require('../controller/ReceiptController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authrozation');

//secure routes below
router.use(requireAuth);
// STORE_API routes
router.get('/:id', checkAuthrozation('STORE_API'), GetReceiptByID);
router.get('/delivred/:id', checkAuthrozation('STORE_API'), GetAlldeliveredReceiptsByStore);
router.get('/noneDelivred/:id', checkAuthrozation('STORE_API'), GetAllNonedeliveredReceiptsByStore);
router.get('/clientForStore/:client/:store', checkAuthrozation('STORE_API'), GetAllReceiptsByClientForStore);
router.patch('/validate/:id', checkAuthrozation('STORE_API'), ValidateMyReceipt);
router.delete('/:id', checkAuthrozation('STORE_API'), DeleteReceipt);
router.patch('/updateExpectedDeliveryDate/:id', checkAuthrozation('STORE_API'), UpdateReceiptExpextedDeliveryDate);
router.get('/client/:id', checkAuthrozation('STORE_API'), GetAllReceiptsByClient);
// Client_API routes
router.post('/:client', checkAuthrozation('CLIENT_API'), CreateReceipt);


module.exports = router;