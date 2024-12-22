const express = require('express');
const {
    GetAllPopularProductbyStore,
    AddPopularProduct,
    RemovePopularProduct
} = require('../controller/PopularProductController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');
const checkStoreAccessibility = require('../middleware/CheckStoreAccessibility');
const checkStoreOwnership = require('../middleware/CheckStoreOwnership');

//secure routes below
router.use(requireAuth);

// SHARED_API routes below

// CLIENT_API routes below
//get all PopularProduct
router.get('/:store/:client', checkAuthrozation([process.env.CLIENT_TYPE]), checkStoreAccessibility, GetAllPopularProductbyStore);

// STORE_API routes below
//create new PopularProduct
router.post('/', checkAuthrozation([process.env.STORE_TYPE]), AddPopularProduct);
//delete a product from PopularProduct
router.patch('/:id', checkAuthrozation([process.env.STORE_TYPE]), RemovePopularProduct);
//get all PopularProduct
router.get('/:store', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, GetAllPopularProductbyStore);

module.exports = router;