const express = require('express');
const router = express.Router();
const {
    SignInAdmin,
    SignInStore,
    SignInClient,
    SignUpStore,
    VerifyStoreOTP,
    SignUpClient,
    SignUpUpdateStore,
    CreateNewClientForAStore,
    CreateNewSellerForAStore
} = require('../controller/AuthController.js');
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');


// SHARED_API routes below
//sign in an admin
router.post('/signin/admin', SignInAdmin);

//sign in a store
router.post('/signin/store', SignInStore);
//sign up a store
router.post('/signup/store', SignUpStore);
//sign up a store
router.patch('/signup/store/:id', SignUpUpdateStore);
//Verify Store OTP
router.post('/signup/store/verify', VerifyStoreOTP);

//sign in a client
router.post('/signin/client', SignInClient);
//sign up a client
router.post('/signup/client', SignUpClient);

//secure routes below
router.use(requireAuth);

//STORE_API routes below
//create new client for a store
router.post('/createNewClient/:store', checkAuthrozation([process.env.STORE_TYPE]), CreateNewClientForAStore);
//create new seller for a store
router.post('/createNewSeller/:store', checkAuthrozation([process.env.STORE_TYPE]), CreateNewSellerForAStore);

module.exports = router;