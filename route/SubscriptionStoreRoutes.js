const express = require('express');
const {
    CreateSubsecriptionStore,
    GetAllSubsecriptionStoreByStore
} = require('../controller/SubscriptionStoreController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');

//secure routes below
router.use(requireAuth);

// SHARED_API routes below
//get all subscriptions for a specific store
router.get('/:id', GetAllSubsecriptionStoreByStore);

// ADMIN_API routes below
//create new Subscription for a specific store
router.post('/create', checkAuthrozation('ADMIN_API'), CreateSubsecriptionStore);

module.exports = router;