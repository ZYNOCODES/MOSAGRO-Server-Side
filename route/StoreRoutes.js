const express = require('express');
const {
    GetAllStores
} = require('../controller/StoreController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');

//secure routes below
router.use(requireAuth);
//fetch all Stores
router.get('/', GetAllStores);

module.exports = router;