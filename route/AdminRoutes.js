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
router.get('/:id', checkAuthrozation('ADMIN_API'), GetAdmin);

module.exports = router;