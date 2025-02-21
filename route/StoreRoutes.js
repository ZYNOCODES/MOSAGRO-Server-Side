const express = require('express');
const {
    GetAllActiveStores,
    GetAllPendingStores,
    GetAllSuspendedStores,
    GetAllActiveStoresNonLinkedToAClient,
    GetStore,
    UpdateStore
} = require('../controller/StoreController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');
const checkSubscription = require('../middleware/CheckSubscription');

//secure routes below
router.use(requireAuth);
router.use(checkSubscription);

// SHARED_API routes below
//fetch specific Store
router.get('/:id', checkAuthrozation([process.env.ADMIN_TYPE, process.env.STORE_TYPE]), GetStore);

//CLIENT_API routes below
//fetch all active Stores not linked to a client
router.get('/all/active/:client', checkAuthrozation([process.env.CLIENT_TYPE]), GetAllActiveStoresNonLinkedToAClient);

// ADMIN_API routes below
//fetch all active Stores
router.get('/all/active', checkAuthrozation([process.env.ADMIN_TYPE]), GetAllActiveStores);
//fetch all pending Stores
router.get('/all/pending', checkAuthrozation([process.env.ADMIN_TYPE]), GetAllPendingStores);
//fetch all suspended Stores
router.get('/all/suspended', checkAuthrozation([process.env.ADMIN_TYPE]), GetAllSuspendedStores);

// STORE_API routes below
//update Store info
router.patch('/:id', checkAuthrozation([process.env.STORE_TYPE]), UpdateStore);

module.exports = router;