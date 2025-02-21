const express = require('express');
const {
    CreateNewSousPurchaseByPurchase,
    FetchLiveSousPurchaseByPurchase,
    FetchAllSousPurchaseByPurchase
} = require('../controller/SousPurchaseController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');
const checkStoreOwnership = require('../middleware/CheckStoreOwnership');
const checkSubscription = require('../middleware/CheckSubscription');

//secure routes below
router.use(requireAuth);
router.use(checkSubscription);

// STORE_API routes below
//Create new sous purchase
router.post('/create/:store', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, CreateNewSousPurchaseByPurchase);
//fetch sous purchase by purchase
router.get('/:id/:store', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, FetchLiveSousPurchaseByPurchase);
//fetch all sous purchase by purchase
router.get('/all/:id/:store', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, FetchAllSousPurchaseByPurchase);

module.exports = router;