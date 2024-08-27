const express = require('express');
const {
    GetAllLosses,
    CreateLoss,
    DeleteLoss
} = require('../controller/LossesController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');

//secure routes below
router.use(requireAuth);

// STORE_API routes below
//get all losses
router.get('/:id', checkAuthrozation([process.env.STORE_TYPE]), GetAllLosses);
//create a loss
router.post('/:store', checkAuthrozation([process.env.STORE_TYPE]), CreateLoss);
//delete a loss
router.delete('/:id', checkAuthrozation([process.env.STORE_TYPE]), DeleteLoss);

module.exports = router;