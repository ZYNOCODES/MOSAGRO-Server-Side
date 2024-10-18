const express = require('express');
const {
    GetAllClientsUnverified,
    GetAllClientsBlocked,
    GetClientByIdForStore,
} = require('../controller/UserController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');
const checkStoreOwnership = require('../middleware/CheckStoreOwnership');
const checkAdminOwnership = require('../middleware/CheckAdminOwnership');

//secure routes below
router.use(requireAuth);

// STORE_API routes below
//fetch specific user by id for specific store
router.get('/:id/:store', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, GetClientByIdForStore);

// ADMIN_API routes below
//fetch all clients unverified
router.get('/admin/unverified/:admin', checkAuthrozation([process.env.ADMIN_TYPE]), checkAdminOwnership, GetAllClientsUnverified);
//fetch all clients blocked
router.get('/admin/blocked/:admin', checkAuthrozation([process.env.ADMIN_TYPE]), checkAdminOwnership, GetAllClientsBlocked);

module.exports = router;