const express = require('express');
const {
    GetAllLossesForStore,
    CreateLossForStore,
    DeleteLossForStore,
    GetStatisticsForStore,
    GetAllLossesForAdmin,
    CreateLossForAdmin,
    DeleteLossForAdmin,
    GetStatisticsForAdmin
} = require('../controller/LossesController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');
const limiter = require('../middleware/RateLimiting.js');
const limiterForGet = require('../middleware/RateLimiterForGet.js');
const checkStoreOwnership = require('../middleware/CheckStoreOwnership');
const checkAdminOwnership = require('../middleware/CheckAdminOwnership');

//secure routes below
router.use(requireAuth);

// STORE_API routes below
//get all losses
router.get('/store/:store', limiterForGet, checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, GetAllLossesForStore);
//create a loss
router.post('/store/create/:store', limiter, checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, CreateLossForStore);
//delete a loss
router.delete('/store/:id/:store', limiter, checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, DeleteLossForStore);
//get statistics for store
router.get('/store/statistics/:store', limiterForGet, checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, GetStatisticsForStore);

// ADMIN_API routes below
//get all losses
router.get('/admin/:admin', limiterForGet, checkAuthrozation([process.env.ADMIN_TYPE]), checkAdminOwnership, GetAllLossesForAdmin);
//create a loss
router.post('/admin/create/:admin', limiter, checkAuthrozation([process.env.ADMIN_TYPE]), checkAdminOwnership, CreateLossForAdmin);
//delete a loss
router.delete('/admin/:id/:admin', limiter, checkAuthrozation([process.env.ADMIN_TYPE]), checkAdminOwnership, DeleteLossForAdmin);
//get statistics for admin
router.get('/admin/statistics/:admin', limiterForGet, checkAuthrozation([process.env.ADMIN_TYPE]), checkAdminOwnership, GetStatisticsForAdmin);

module.exports = router;