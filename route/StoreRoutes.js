const express = require('express');
const {
    GetAllStores,
    GetStore
} = require('../controller/StoreController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authrozation');

//secure routes below
router.use(requireAuth);

// SHARED_API routes below
//fetch specific Store
router.get('/:id', GetStore);

// ADMIN_API routes below
//fetch all Stores
router.get('/', checkAuthrozation('ADMIN_API'), GetAllStores);

module.exports = router;