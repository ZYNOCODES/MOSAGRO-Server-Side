const express = require('express');
const {
    GetAllUsers,
    GetUserByIdForStore,
} = require('../controller/UserController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');

//secure routes below
router.use(requireAuth);

// STORE_API routes below
//fetch specific user by id for specific store
router.get('/:id/:store', checkAuthrozation([process.env.STORE_TYPE]), GetUserByIdForStore);

// ADMIN_API routes below
//fetch all Users
router.get('/', checkAuthrozation([process.env.ADMIN_TYPE]), GetAllUsers);

module.exports = router;