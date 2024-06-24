const express = require('express');
const {
    GetAllUsers,
    AddStoreToMyList
} = require('../controller/UserController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');

//secure routes below
router.use(requireAuth);
//fetch all Users
router.get('/', GetAllUsers);
//add stores to my store collection
router.patch('/:id/AddStore', AddStoreToMyList);

module.exports = router;