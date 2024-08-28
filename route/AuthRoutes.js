const express = require('express');
const router = express.Router();
const {
    SignIn,
    SignUp,
    CreateNewClientForAStore
} = require('../controller/AuthController.js');
const checkAuthrozation = require('../middleware/Authorization');


// SHARED_API routes below
router.post('/signin', SignIn);
router.post('/signup', SignUp);

//STORE_API routes below
//create new client for a store
router.post('/createNewClient/:store', checkAuthrozation([process.env.STORE_TYPE]), CreateNewClientForAStore);


module.exports = router;