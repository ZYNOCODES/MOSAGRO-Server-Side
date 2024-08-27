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
const checkAuthrozation = require('../middleware/Authorization');

//secure routes below
router.use(requireAuth);

// CLIENT_API routes below
//get all MyStores
router.get('/:id', checkAuthrozation([process.env.CLIENT_TYPE]), GetAllMyStoresbyUser);
//create new MyStores
router.patch('/:id', checkAuthrozation([process.env.CLIENT_TYPE]), AddStoreToMyList);

// STORE_API routes below
//get all users by store
router.get('/users/:id', checkAuthrozation([process.env.STORE_TYPE]), GetAllUsersByStore);
//get all not approved users by store
router.get('/notApprovedUsers/:id', checkAuthrozation([process.env.STORE_TYPE]), GetAllNotApprovedUsersByStore);
//approve user to access store
router.patch('/approve/:id', checkAuthrozation([process.env.STORE_TYPE]), ApproveUserToAccessStore);
//delete a store from MyStores
router.patch('/delete/:id', checkAuthrozation([process.env.STORE_TYPE]), DeleteStoreFromMyStores);

module.exports = router;