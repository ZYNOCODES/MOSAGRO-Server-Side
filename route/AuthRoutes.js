const express = require('express');
const router = express.Router();
const {
    SignIn,
    SignUp
} = require('../controller/AuthController.js');


// SHARED_API routes below
router.post('/signin', SignIn);
router.post('/signup', SignUp);


module.exports = router;