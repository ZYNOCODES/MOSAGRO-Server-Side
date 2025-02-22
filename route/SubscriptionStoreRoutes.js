const express = require('express');
const {
    CreateSubsecriptionStoreByStore,
    CreateSubsecriptionStoreByAdmin,
    GetAllSubsecriptionStoreByStore,
    GetAllSubsecriptionRequests,
    ValidateSubscriptionRequest,
} = require('../controller/SubscriptionStoreController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const limiter = require('../middleware/RateLimiting.js');
const checkAuthrozation = require('../middleware/Authorization');
const checkAdminOwnership = require('../middleware/CheckAdminOwnership.js');
const checkStoreOwnership = require('../middleware/CheckStoreOwnership.js');
const checkSubscription = require('../middleware/CheckSubscription');

//secure routes below
router.use(requireAuth);
router.use(checkSubscription);

// STORE_API routes below
//create new Subscription for a specific store
router.post('/create/:store', limiter, checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, CreateSubsecriptionStoreByStore);

// ADMIN_API routes below
//create new Subscription for a specific store
router.post('/create/admin/:admin', limiter, checkAuthrozation([process.env.ADMIN_TYPE]), checkAdminOwnership, CreateSubsecriptionStoreByAdmin);
//get all subscriptions for a specific store
router.get('/bystore/:admin/:id', checkAuthrozation([process.env.ADMIN_TYPE]), checkAdminOwnership, GetAllSubsecriptionStoreByStore);
//get all subscription requests
router.get('/requests/:admin', checkAuthrozation([process.env.ADMIN_TYPE]), checkAdminOwnership, GetAllSubsecriptionRequests);
//validate a subscription request
router.patch('/validate/:admin/:id', checkAuthrozation([process.env.ADMIN_TYPE]), checkAdminOwnership, ValidateSubscriptionRequest);


module.exports = router;