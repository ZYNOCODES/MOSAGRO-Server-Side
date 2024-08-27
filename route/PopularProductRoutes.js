const express = require('express');
const {
    GetAllPopularProductbyStore,
    AddPopularProduct,
    RemovePopularProduct
} = require('../controller/PopularProductController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');

//secure routes below
router.use(requireAuth);

// SHARED_API routes below
//get all PopularProduct
router.get('/:id', GetAllPopularProductbyStore);

// STORE_API routes below
//create new PopularProduct
router.post('/', checkAuthrozation([process.env.STORE_TYPE]), AddPopularProduct);
//delete a product from PopularProduct
router.patch('/:id', checkAuthrozation([process.env.STORE_TYPE]), RemovePopularProduct);

module.exports = router;