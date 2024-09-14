const express = require('express');
const {
    CreateNewReceiptStatusForReceipt,
    FetchLiveReceiptStatusByReceipt,
    FetchAllReceiptStatusByReceipt
} = require('../controller/ReceiptStatusController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');

//secure routes below
router.use(requireAuth);

// STORE_API routes below
//Create new receipt status
router.post('/create/:receipt', checkAuthrozation([process.env.STORE_TYPE]), CreateNewReceiptStatusForReceipt);
//fetch receipt status by receipt
router.get('/:id/:store', checkAuthrozation([process.env.STORE_TYPE]), FetchLiveReceiptStatusByReceipt);
//fetch all receipt status by receipt
router.get('/all/:id/:store', checkAuthrozation([process.env.STORE_TYPE]), FetchAllReceiptStatusByReceipt);

module.exports = router;