const express = require('express');
const {
    GetAllLosses,
    CreateLoss,
    UpdateLoss,
    DeleteLoss,
    GetStatisticsForStore
} = require('../controller/LossesController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');
const limiter = require('../middleware/RateLimiting.js');
const limiterForGet = require('../middleware/RateLimiterForGet.js');

//secure routes below
router.use(requireAuth);

// STORE_API routes below
//get all losses
router.get('/:id', limiterForGet, checkAuthrozation([process.env.STORE_TYPE]), GetAllLosses);
//create a loss
router.post('/create/:store', limiter, checkAuthrozation([process.env.STORE_TYPE]), CreateLoss);
//update a loss
router.put('/:id', limiter, checkAuthrozation([process.env.STORE_TYPE]), UpdateLoss);
//delete a loss
router.delete('/:id/:store', limiter, checkAuthrozation([process.env.STORE_TYPE]), DeleteLoss);
//get statistics for store
router.get('/statistics/:store', limiterForGet, checkAuthrozation([process.env.STORE_TYPE]), GetStatisticsForStore);

module.exports = router;