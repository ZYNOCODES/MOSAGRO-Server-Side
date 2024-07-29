const express = require('express');
const {
    GetAdmin
} = require('../controller/AdminController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');

//secure routes below
router.use(requireAuth);
//fetch specific admin
router.get('/:id', GetAdmin);

module.exports = router;