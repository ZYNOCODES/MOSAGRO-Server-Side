const express = require('express');
const {
    GetAllStores,
    GetStore,
    UpdateStore
} = require('../controller/StoreController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');

//secure routes below
router.use(requireAuth);

// SHARED_API routes below
//fetch specific Store
router.get('/:id', GetStore);

// ADMIN_API routes below
//fetch all Stores
router.get('/', checkAuthrozation('ADMIN_API'), GetAllStores);

// STORE_API routes below
//update Store info
router.patch('/:id', checkAuthrozation('STORE_API'), UpdateStore);

module.exports = router;