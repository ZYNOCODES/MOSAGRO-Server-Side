const express = require('express');
const {
    FetchLiveStockStatusByStock,
    FetchEndedStockStatusByStock,
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
router.get('/:id', checkAuthrozation([process.env.STORE_TYPE]), FetchLiveStockStatusByStock);
//fetch stock status by stock
router.get('/ended/:id', checkAuthrozation([process.env.STORE_TYPE]), FetchEndedStockStatusByStock);
//update stock status
router.patch('/update/status/:id', checkAuthrozation([process.env.STORE_TYPE]), UpdateStockStatus);
//update stock end status
router.patch('/update/endstatus/:id', checkAuthrozation([process.env.STORE_TYPE]), UpdateStockEndStatus);

module.exports = router;