const express = require('express');
const {
    CreateStock,
    FetchStockByID,
    FetchStockByStore,
    UpdateStock,
    UpdateStockQuantityLimitation,
    DeleteStock,
} = require('../controller/StockController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');

//secure routes below
router.use(requireAuth);

// SHARED_API routes below


// STORE_API routes below


//fetch stock by store
router.get('/:id', FetchStockByID);
//create new stock
router.post('/create', checkAuthrozation('STORE_API'), CreateStock);
//update stock
router.patch('/update/:id', checkAuthrozation('STORE_API'), UpdateStock);
//update stock quantity limitation
router.patch('/update/quantitylimit/:id', checkAuthrozation('STORE_API'), UpdateStockQuantityLimitation);
//delete stock
router.delete('/delete/:id', checkAuthrozation('STORE_API'), DeleteStock);
//fetch stock by store
router.get('/store/:Store', FetchStockByStore);

module.exports = router;