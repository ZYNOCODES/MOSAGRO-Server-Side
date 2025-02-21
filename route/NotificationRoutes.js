const express = require('express');
const {
    getNotificationsByStore,
    getNonReadedNotificationsByClient,
    getReadedNotificationsByClient,
    markNotificationAsRead,
    markAllNotificationsAsRead,
} = require('../controller/NotificationController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');
const checkClientOwnership = require('../middleware/CheckClientOwnership');
const checkStoreOwnership = require('../middleware/CheckStoreOwnership');
const checkSubscription = require('../middleware/CheckSubscription');

//secure routes below
router.use(requireAuth);
router.use(checkSubscription);

// SHEARED_API routes below
//mark notification as read
router.patch('/asRead/:id', checkAuthrozation([process.env.CLIENT_TYPE, process.env.STORE_TYPE]), markNotificationAsRead);
//mark all notifications as read
router.patch('/asRead/all/:client', checkAuthrozation([process.env.CLIENT_TYPE, process.env.STORE_TYPE]), markAllNotificationsAsRead);

// STORE_API routes below
//get all notifications by store
router.get('/store/:store', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, getNotificationsByStore);


// CLIENT_API routes below
//get all non readed notifications by client
router.get('/client/nonRead/:id', checkAuthrozation([process.env.CLIENT_TYPE]), checkClientOwnership, getNonReadedNotificationsByClient);
//get all readed notifications by client
router.get('/client/read/:id', checkAuthrozation([process.env.CLIENT_TYPE]), checkClientOwnership, getReadedNotificationsByClient);
module.exports = router;