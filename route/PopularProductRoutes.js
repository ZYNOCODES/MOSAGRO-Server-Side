const express = require('express');
const {
    GetAllPopularProductbyStore,
    AddPopularProduct,
    RemovePopularProduct
} = require('../controller/PopularProductController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authrozation');

//secure routes below
router.use(requireAuth);

// SHARED_API routes below
//get all PopularProduct
router.get('/:id', GetAllPopularProductbyStore);

// STORE_API routes below
//create new PopularProduct
router.post('/', checkAuthrozation('STORE_API'), AddPopularProduct);
//delete a product from PopularProduct
router.patch('/:id', checkAuthrozation('STORE_API'), RemovePopularProduct);

module.exports = router;