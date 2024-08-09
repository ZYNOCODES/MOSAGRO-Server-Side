const express = require('express');
const {
    GetAllUsers,
    GetUserById,
} = require('../controller/UserController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authrozation');

//secure routes below
router.use(requireAuth);

// SHARED_API routes below
//fetch specific user by id
router.get('/:id', GetUserById);

// ADMIN_API routes below
//fetch all Users
router.get('/', checkAuthrozation('ADMIN_API'), GetAllUsers);

module.exports = router;