const express = require('express');
const {
    CreateStock,
    FetchStockByID,
    FetchStockByStore,
    FetchStockByStoreClient,
    UpdateStock,
    UpdateStockBasicInformation,
    DeleteStock,
} = require('../controller/StockController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');
const checkStoreAccessibility = require('../middleware/CheckStoreAccessibility');
const checkStoreOwnership = require('../middleware/CheckStoreOwnership');
const checkClientOwnership = require('../middleware/CheckClientOwnership');
const checkSubscription = require('../middleware/CheckSubscription');

//secure routes below
router.use(requireAuth);
router.use(checkSubscription);

// CLIENT_API routes below
//fetch stock by store and client
router.get('/store/:id/:store', checkAuthrozation([process.env.CLIENT_TYPE]), checkClientOwnership, FetchStockByStoreClient);


// STORE_API routes below
//fetch stock by store
router.get('/:id', FetchStockByID);
//create new stock
router.post('/create', checkAuthrozation([process.env.STORE_TYPE]), CreateStock);
//update stock
router.patch('/update/:id', checkAuthrozation([process.env.STORE_TYPE]), UpdateStock);
//update stock quantity limitation
router.patch('/update/basic/:store/:id', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, UpdateStockBasicInformation);
//delete stock
router.delete('/delete/:store', checkAuthrozation([process.env.STORE_TYPE]), DeleteStock);
//fetch stock by store
router.get('/store/:store', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, FetchStockByStore);

module.exports = router;