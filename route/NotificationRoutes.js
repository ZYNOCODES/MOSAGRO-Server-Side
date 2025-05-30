const express = require('express');
const {
    getNewNotificationsByStore,
    getOldNotificationsByStore,
    getNonReadedNotificationsByClient,
    getReadedNotificationsByClient,
    getNonReadedNotificationsByAdmin,
    getReadedNotificationsByAdmin,
    markNotificationAsRead,
    markAllNotificationsAsRead,
} = require('../controller/NotificationController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');
const checkClientOwnership = require('../middleware/CheckClientOwnership');
const checkStoreOwnership = require('../middleware/CheckStoreOwnership');
const checkAdminOwnership = require('../middleware/CheckAdminOwnership');
const checkSubscription = require('../middleware/CheckSubscription');

//secure routes below
router.use(requireAuth);
router.use(checkSubscription);

// SHEARED_API routes below
//mark notification as read
router.patch('/asRead/:id', checkAuthrozation([process.env.CLIENT_TYPE, process.env.STORE_TYPE, process.env.ADMIN_TYPE]), markNotificationAsRead);
//mark all notifications as read
router.patch('/asRead/all/:client', checkAuthrozation([process.env.CLIENT_TYPE, process.env.STORE_TYPE, process.env.ADMIN_TYPE]), markAllNotificationsAsRead);

// STORE_API routes below
//get all new notifications by store
router.get('/store/new/:store', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, getNewNotificationsByStore);
//get all old notifications by store
router.get('/store/old/:store', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, getOldNotificationsByStore);


// CLIENT_API routes below
//get all non readed notifications by client
router.get('/client/nonRead/:id', checkAuthrozation([process.env.CLIENT_TYPE]), checkClientOwnership, getNonReadedNotificationsByClient);
//get all readed notifications by client
router.get('/client/read/:id', checkAuthrozation([process.env.CLIENT_TYPE]), checkClientOwnership, getReadedNotificationsByClient);

// ADMIN_API routes below
//get all non readed notifications by admin
router.get('/admin/nonRead/:admin', checkAuthrozation([process.env.ADMIN_TYPE]), checkAdminOwnership, getNonReadedNotificationsByAdmin);
//get all readed notifications by admin
router.get('/admin/read/:admin', checkAuthrozation([process.env.ADMIN_TYPE]), checkAdminOwnership, getReadedNotificationsByAdmin);

module.exports = router;