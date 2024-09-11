const express = require('express');
const router = express.Router();
const {
    SignIn,
    SignUp,
    CreateNewClientForAStore,
    CreateNewSellerForAStore
} = require('../controller/AuthController.js');
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');


// SHARED_API routes below
router.post('/signin', SignIn);
router.post('/signup', SignUp);

//secure routes below
router.use(requireAuth);

//STORE_API routes below
//create new client for a store
router.post('/createNewClient/:store', checkAuthrozation([process.env.STORE_TYPE]), CreateNewClientForAStore);
//create new seller for a store
router.post('/createNewSeller/:store', checkAuthrozation([process.env.STORE_TYPE]), CreateNewSellerForAStore);


module.exports = router;