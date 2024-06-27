const express = require('express');
const {
    GetAllMyStoresbyUser,
    AddStoreToMyList,
    DeleteStoreFromMyStores
} = require('../controller/MyStoresController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');

//secure routes below
router.use(requireAuth);
//get all MyStores
router.get('/:id', GetAllMyStoresbyUser);
//create new MyStores
router.patch('/:id', AddStoreToMyList);
//delete a store from MyStores
router.patch('/delete/:id', DeleteStoreFromMyStores);

module.exports = router;