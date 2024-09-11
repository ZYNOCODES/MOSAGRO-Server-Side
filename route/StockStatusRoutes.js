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

//secure routes below
router.use(requireAuth);

// STORE_API routes below
//Create new stock status
router.post('/create/:stock', checkAuthrozation([process.env.STORE_TYPE]), CreateNewStockStatusForStock);
//fetch stock status by stock
router.get('/:id', checkAuthrozation([process.env.STORE_TYPE]), FetchLiveStockStatusByStock);
//update stock status
router.patch('/update/:id', checkAuthrozation([process.env.STORE_TYPE]), UpdateStockStatus);
//delete stock status
router.delete('/delete/:id', checkAuthrozation([process.env.STORE_TYPE]), DeleteStockStatus);

module.exports = router;