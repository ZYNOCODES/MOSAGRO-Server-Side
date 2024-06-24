const express = require('express');
const {
    CreateSubscription,
    GetAllSubscriptions,
    UpdateSubscription,
    DeleteSubscription
} = require('../controller/SubscriptionController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');

//secure routes below
router.use(requireAuth);
//create new Subscription
router.post('/create', CreateSubscription);
//fetch all Subscriptions
router.get('/', GetAllSubscriptions);
//update Subscription
router.patch('/update/:id', UpdateSubscription);
//delete Subscription
router.delete('/delete/:id', DeleteSubscription);

module.exports = router;