const express = require('express');
const {
    CreateSubscription,
    GetAllSubscriptions,
    UpdateSubscription,
    DeleteSubscription
} = require('../controller/SubscriptionController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authrozation');

//secure routes below
router.use(requireAuth);

// SHARED_API routes below
//fetch all Subscriptions
router.get('/', GetAllSubscriptions);

// ADMIN_API routes below
//create new Subscription
router.post('/create', checkAuthrozation('ADMIN_API'), CreateSubscription);
//update Subscription
router.patch('/update/:id', checkAuthrozation('ADMIN_API'), UpdateSubscription);
//delete Subscription
router.delete('/delete/:id', checkAuthrozation('ADMIN_API'), DeleteSubscription);

module.exports = router;