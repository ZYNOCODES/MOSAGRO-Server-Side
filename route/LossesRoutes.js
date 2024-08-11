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
router.get('/:id', checkAuthrozation('STORE_API'), GetAllLosses);
//create a loss
router.post('/:store', checkAuthrozation('STORE_API'), CreateLoss);
//delete a loss
router.delete('/:id', checkAuthrozation('STORE_API'), DeleteLoss);

module.exports = router;