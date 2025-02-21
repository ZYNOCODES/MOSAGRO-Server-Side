const express = require('express');
const {
    GetAdmin
} = require('../controller/AdminController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');
const checkSubscription = require('../middleware/CheckSubscription');

//secure routes below
router.use(requireAuth);
router.use(checkSubscription);

// ADMIN_API routes below
//fetch specific admin
router.get('/:id', checkAuthrozation([process.env.ADMIN_TYPE]), GetAdmin);

module.exports = router;