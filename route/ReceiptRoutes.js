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
} = require('../controller/ReceiptController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');

//secure routes below
router.use(requireAuth);
//fetch specific receipt
router.get('/:id', GetReceiptByID);
//fetch all delivred receipts
router.get('/delivred/:id', GetAlldeliveredReceiptsByStore);
//fetch all none delivred receipts
router.get('/noneDelivred/:id', GetAllNonedeliveredReceiptsByStore);
//validate receipt
router.patch('/validate/:id', ValidateMyReceipt);
//delete receipt
router.delete('/:id', DeleteReceipt);
//create receipt
router.post('/', CreateReceipt);
//update receipt expected delivery date
router.patch('/updateExpectedDeliveryDate/:id', UpdateReceiptExpextedDeliveryDate);
//fetch all receipts by client
router.get('/client/:id', GetAllReceiptsByClient);


module.exports = router;