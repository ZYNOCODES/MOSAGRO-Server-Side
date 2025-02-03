const express = require('express');
const {
    getNotificationsByStore,
    getNotificationsByClient,
    markNotificationAsRead,
    markAllNotificationsAsRead,
} = require('../controller/NotificationController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');
const checkClientOwnership = require('../middleware/CheckClientOwnership');
const checkStoreOwnership = require('../middleware/CheckStoreOwnership');


//secure routes below
router.use(requireAuth);

// SHEARED_API routes below
//mark notification as read
router.patch('/:id', checkAuthrozation([process.env.CLIENT_TYPE, process.env.STORE_TYPE]), markNotificationAsRead);
//mark all notifications as read
router.patch('/all/:client', checkAuthrozation([process.env.CLIENT_TYPE, process.env.STORE_TYPE]), markAllNotificationsAsRead);

// STORE_API routes below
//get all notifications by store
router.get('/store/:store', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, getNotificationsByStore);


// CLIENT_API routes below
//get all notifications by client
router.get('/client/:id', checkAuthrozation([process.env.CLIENT_TYPE]), checkClientOwnership, getNotificationsByClient);

module.exports = router;