const express = require('express');
const {
    CreateSubsecriptionStoreByStore,
    CreateSubsecriptionStoreByAdmin,
    GetAllSubsecriptionStoreByStore
} = require('../controller/SubscriptionStoreController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');
const checkAdminOwnership = require('../middleware/CheckAdminOwnership.js');
const limiter = require('../middleware/RateLimiting.js');
const checkSubscription = require('../middleware/CheckSubscription');

//secure routes below
router.use(requireAuth);
router.use(checkSubscription);

// SHARED_API routes below
//get all subscriptions for a specific store
router.get('/:id', checkAuthrozation([process.env.ADMIN_TYPE, process.env.STORE_TYPE]), GetAllSubsecriptionStoreByStore);
//create new Subscription for a specific store
router.post('/create', limiter, checkAuthrozation([process.env.ADMIN_TYPE, process.env.STORE_TYPE]), CreateSubsecriptionStoreByStore);

// ADMIN_API routes below
//create new Subscription for a specific store
router.post('/create/admin/:admin', limiter, checkAuthrozation([process.env.ADMIN_TYPE]), checkAdminOwnership, CreateSubsecriptionStoreByAdmin);


module.exports = router;