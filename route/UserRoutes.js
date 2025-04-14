const express = require('express');
const {
    GetAllClientsVerified,
    GetAllClientsUnverified,
    GetAllClientsBlocked,
    GetClientByIdForStore,
    BlockClient,
    UnblockClient,
    VerifyClient,
    UpdateUserProfile
} = require('../controller/UserController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');
const checkStoreOwnership = require('../middleware/CheckStoreOwnership');
const checkAdminOwnership = require('../middleware/CheckAdminOwnership');
const checkClientOwnership = require('../middleware/CheckClientOwnership');
const checkSubscription = require('../middleware/CheckSubscription');

//secure routes below
router.use(requireAuth);
router.use(checkSubscription);

//CLIENT_API routes below
//update client profile
router.patch('/update/profile/:id', checkAuthrozation([process.env.CLIENT_TYPE]), checkClientOwnership, UpdateUserProfile);

// STORE_API routes below
//fetch specific user by id for specific store
router.get('/:id/:store', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, GetClientByIdForStore);

// ADMIN_API routes below
//fetch all clients verified
router.get('/admin/verified/:admin', checkAuthrozation([process.env.ADMIN_TYPE]), checkAdminOwnership, GetAllClientsVerified);
//fetch all clients unverified
router.get('/admin/unverified/:admin', checkAuthrozation([process.env.ADMIN_TYPE]), checkAdminOwnership, GetAllClientsUnverified);
//fetch all clients blocked
router.get('/admin/blocked/:admin', checkAuthrozation([process.env.ADMIN_TYPE]), checkAdminOwnership, GetAllClientsBlocked);
//block client
router.patch('/admin/block/:admin', checkAuthrozation([process.env.ADMIN_TYPE]), checkAdminOwnership, BlockClient);
//unblock client
router.patch('/admin/unblock/:admin', checkAuthrozation([process.env.ADMIN_TYPE]), checkAdminOwnership, UnblockClient);
//verify client
router.patch('/admin/verify/:admin', checkAuthrozation([process.env.ADMIN_TYPE]), checkAdminOwnership, VerifyClient);

module.exports = router;