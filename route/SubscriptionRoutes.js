const express = require('express');
const {
    CreateSubscription,
    GetAllSubscriptions,
    UpdateSubscription,
    DeleteSubscription
} = require('../controller/SubscriptionController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');
const checkAdminOwnership = require('../middleware/CheckAdminOwnership.js');
const checkSubscription = require('../middleware/CheckSubscription');
const limiter = require('../middleware/RateLimiting.js');

//secure routes below
router.use(requireAuth);
router.use(checkSubscription);

// SHARED_API routes below
//fetch all Subscriptions
router.get('/', GetAllSubscriptions);

// ADMIN_API routes below
//create new Subscription
router.post('/create/:admin', limiter, checkAuthrozation([process.env.ADMIN_TYPE]), checkAdminOwnership, CreateSubscription);
//update Subscription
router.patch('/update/:admin/:id', limiter, checkAuthrozation([process.env.ADMIN_TYPE]), checkAdminOwnership, UpdateSubscription);
//delete Subscription
router.delete('/delete/:admin/:id', limiter, checkAuthrozation([process.env.ADMIN_TYPE]), checkAdminOwnership, DeleteSubscription);

module.exports = router;