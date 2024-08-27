const express = require('express');
const {
    GetAdmin
} = require('../controller/AdminController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');

//secure routes below
router.use(requireAuth);

// ADMIN_API routes below
//fetch specific admin
router.get('/:id', checkAuthrozation([process.env.ADMIN_TYPE]), GetAdmin);

module.exports = router;