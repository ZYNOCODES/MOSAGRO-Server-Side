const express = require('express');
const {
    GetAllMyStoresbyUser,
    GetAllNonActiveMyStoresbyUser,
    GetAllUsersByStore,
    GetAllNotApprovedUsersByStore,
    GetAllSellersUsersByStore,
    AddStoreToMyList,
    ApproveUserToAccessStore,
    RejectUserToAccessStore,
    MakeUserSeller,
    DeleteStoreFromMyStores,
    AddNewAddressToUser
} = require('../controller/MyStoresController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');
const checkStoreOwnership = require('../middleware/CheckStoreOwnership');
const checkAdminOwnership = require('../middleware/CheckAdminOwnership');
const checkClientOwnership = require('../middleware/CheckClientOwnership');


//secure routes below
router.use(requireAuth);

// CLIENT_API routes below
//get all MyStores
router.get('/:id', checkAuthrozation([process.env.CLIENT_TYPE]), checkClientOwnership, GetAllMyStoresbyUser);
//get all non active MyStores
router.get('/nonActive/:id', checkAuthrozation([process.env.CLIENT_TYPE]), checkClientOwnership, GetAllNonActiveMyStoresbyUser);
//create new MyStores
router.post('/:id', checkAuthrozation([process.env.CLIENT_TYPE]), checkClientOwnership, AddStoreToMyList);

// STORE_API routes below
//get all users by store
router.get('/users/:id', checkAuthrozation([process.env.STORE_TYPE]), GetAllUsersByStore);
//get all not approved users by store
router.get('/notApprovedUsers/:id', checkAuthrozation([process.env.STORE_TYPE]), GetAllNotApprovedUsersByStore);
//get all sellers users by store
router.get('/sellers/:id', checkAuthrozation([process.env.STORE_TYPE]), GetAllSellersUsersByStore);
//reject user to access store
router.patch('/reject/:id', checkAuthrozation([process.env.STORE_TYPE]), RejectUserToAccessStore);
//make user seller
router.patch('/makeSeller/:id', checkAuthrozation([process.env.STORE_TYPE]), MakeUserSeller);
//approve user to access store
router.patch('/approve/:id', checkAuthrozation([process.env.STORE_TYPE]), ApproveUserToAccessStore);
//delete a store from MyStores
router.delete('/delete/:store', checkAuthrozation([process.env.STORE_TYPE]), DeleteStoreFromMyStores);
//add new address to user
router.patch('/addAddress/:store', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, AddNewAddressToUser);

module.exports = router;