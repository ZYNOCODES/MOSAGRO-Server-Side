const express = require('express');
const {
    FetchStockStatusByStock,
    UpdateStockStatus,
    UpdateStockEndStatus
} = require('../controller/StockStatusController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');

//secure routes below
router.use(requireAuth);

// STORE_API routes below
//fetch stock status by stock
router.get('/:id', checkAuthrozation('STORE_API'), FetchStockStatusByStock);
//update stock status
router.patch('/update/status/:id', checkAuthrozation('STORE_API'), UpdateStockStatus);
//update stock end status
router.patch('/update/endstatus/:id', checkAuthrozation('STORE_API'), UpdateStockEndStatus);

module.exports = router;