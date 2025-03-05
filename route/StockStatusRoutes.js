const express = require('express');
const {
    CreateNewStockStatusForStock,
    FetchLiveStockStatusByStock,
    UpdateStockStatus,
    DeleteStockStatus
} = require('../controller/StockStatusController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');
const checkSubscription = require('../middleware/CheckSubscription');
const checkStoreOwnership = require('../middleware/CheckStoreOwnership');

//secure routes below
router.use(requireAuth);
router.use(checkSubscription);

// STORE_API routes below
//Create new stock status
router.post('/create/:store/:stock', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, CreateNewStockStatusForStock);
//fetch stock status by stock
router.get('/:store/:id', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, FetchLiveStockStatusByStock);
//update stock status
// router.patch('/update/:store/:id', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, UpdateStockStatus);
//delete stock status
router.delete('/delete/:store/:id', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, DeleteStockStatus);

module.exports = router;