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

//secure routes below
router.use(requireAuth);
//get all MyStores
router.get('/:id', GetAllMyStoresbyUser);
//get all users by store
router.get('/users/:id', GetAllUsersByStore);
//get all not approved users by store
router.get('/notApprovedUsers/:id', GetAllNotApprovedUsersByStore);
//create new MyStores
router.patch('/:id', AddStoreToMyList);
//approve user to access store
router.patch('/approve/:id', ApproveUserToAccessStore);
//delete a store from MyStores
router.patch('/delete/:id', DeleteStoreFromMyStores);

module.exports = router;