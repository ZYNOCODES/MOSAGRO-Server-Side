const express = require('express');
const {
    CreateSubsecriptionStore,
    GetAllSubsecriptionStoreByStore
} = require('../controller/SubscriptionStoreController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');

//secure routes below
router.use(requireAuth);
//create new Subscription for a specific store
router.post('/create', CreateSubsecriptionStore);
//get all subscriptions for a specific store
router.get('/:id', GetAllSubsecriptionStoreByStore);

module.exports = router;