const express = require('express');
const {
    GetAllStores,
    GetStore
} = require('../controller/StoreController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');

//secure routes below
router.use(requireAuth);
//fetch all Stores
router.get('/', GetAllStores);
//fetch specific Store
router.get('/:id', GetStore);

module.exports = router;