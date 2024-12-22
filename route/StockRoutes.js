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
const checkStoreAccessibility = require('../middleware/CheckStoreAccessibility');
const checkStoreOwnership = require('../middleware/CheckStoreOwnership');

//secure routes below
router.use(requireAuth);

// CLIENT_API routes below
//fetch stock by store
router.get('/store/:store/:client', checkAuthrozation([process.env.CLIENT_TYPE]), checkStoreAccessibility, FetchStockByStore);


// STORE_API routes below
//fetch stock by store
router.get('/:id', FetchStockByID);
//create new stock
router.post('/create', checkAuthrozation([process.env.STORE_TYPE]), CreateStock);
//update stock
router.patch('/update/:id', checkAuthrozation([process.env.STORE_TYPE]), UpdateStock);
//update stock quantity limitation
router.patch('/update/quantitylimit/:id', checkAuthrozation([process.env.STORE_TYPE]), UpdateStockQuantityLimitation);
//delete stock
router.delete('/delete/:store', checkAuthrozation([process.env.STORE_TYPE]), DeleteStock);
//fetch stock by store
router.get('/store/:store', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, FetchStockByStore);

module.exports = router;