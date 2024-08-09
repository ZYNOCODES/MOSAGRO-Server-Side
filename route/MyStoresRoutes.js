const express = require('express');
const {
    GetAllMyStoresbyUser,
    GetAllUsersByStore,
    GetAllNotApprovedUsersByStore,
    AddStoreToMyList,
    ApproveUserToAccessStore,
    DeleteStoreFromMyStores
} = require('../controller/MyStoresController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authrozation');

//secure routes below
router.use(requireAuth);

// CLIENT_API routes below
//get all MyStores
router.get('/:id', checkAuthrozation('CLIENT_API'), GetAllMyStoresbyUser);
//create new MyStores
router.patch('/:id', checkAuthrozation('CLIENT_API'), AddStoreToMyList);

// STORE_API routes below
//get all users by store
router.get('/users/:id', checkAuthrozation('STORE_API'), GetAllUsersByStore);
//get all not approved users by store
router.get('/notApprovedUsers/:id', checkAuthrozation('STORE_API'), GetAllNotApprovedUsersByStore);
//approve user to access store
router.patch('/approve/:id', checkAuthrozation('STORE_API'), ApproveUserToAccessStore);
//delete a store from MyStores
router.patch('/delete/:id', checkAuthrozation('STORE_API'), DeleteStoreFromMyStores);

module.exports = router;