const express = require('express');
const {
    fetchAllAdminPublicPublicities,
    fetchAllStorePublicPublicities,
    fetchAllStorePublicitiesFromAdmin,
    fetchAllStorePublicities,
    fetchAllPublicPublicities,
    createPublicityFromStore,
    createPublicityFromAdmin,
    deletePublicityFromAdmin,
    deletePublicityFromStore,
    makePublicityPublic,
} = require('../controller/PublicityController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');
const checkStoreOwnership = require('../middleware/CheckStoreOwnership');
const { upload } = require('../util/ImageUploader');
const checkStoreAccessibility = require('../middleware/CheckStoreAccessibility');

//secure routes below
router.use(requireAuth);

// SHARED_API routes below
// fetch all public publicities
router.get('/fetchAllPublicPublicities', checkAuthrozation([process.env.ADMIN_TYPE, process.env.STORE_TYPE, process.env.CLIENT_TYPE]), fetchAllPublicPublicities);

// CLIENT_API routes below
// fetch all store publicities
router.get('/fetchAllStorePublicities/:store/:client', checkAuthrozation([process.env.CLIENT_TYPE]), checkStoreAccessibility, fetchAllStorePublicities);

// STORE_API routes below
// fetch all store publicities
router.get('/fetchAllStorePublicities/:store', checkAuthrozation([process.env.STORE_TYPE]), fetchAllStorePublicities);
// create publicity from store
router.post('/createFromStore/:store', upload, checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, createPublicityFromStore);
// delete publicity from store
router.delete('/deleteFromStore/:id/:store', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, deletePublicityFromStore);

// ADMIN_API routes below
// fetch all store public publicities
router.get('/fetchAllStorePublicPublicities', checkAuthrozation([process.env.ADMIN_TYPE]), fetchAllStorePublicPublicities);
// fetch all admin public publicities
router.get('/fetchAllAdminPublicPublicities', checkAuthrozation([process.env.ADMIN_TYPE]), fetchAllAdminPublicPublicities);
// fetch all store publicities by store id from admin
router.get('/fetchAllStorePublicitiesFromAdmin/:store', checkAuthrozation([process.env.ADMIN_TYPE]), fetchAllStorePublicitiesFromAdmin);
// create publicity from admin
router.post('/createFromAdmin', upload, checkAuthrozation([process.env.ADMIN_TYPE]), createPublicityFromAdmin);
// delete publicity from admin
router.delete('/deleteFromAdmin/:id', checkAuthrozation([process.env.ADMIN_TYPE]), deletePublicityFromAdmin);
// make publicity public
router.patch('/makePublic/:id', checkAuthrozation([process.env.ADMIN_TYPE]), makePublicityPublic);

module.exports = router;