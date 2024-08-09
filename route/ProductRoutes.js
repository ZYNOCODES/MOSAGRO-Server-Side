const express = require('express');
const {
    CreateProduct,
    GetAllProducts,
    GetProduct,
    UpdateProduct,
    DeleteProduct
} = require('../controller/ProductController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authrozation');

//secure routes below
router.use(requireAuth);

// SHARED_API routes below
//get all products
router.get('/', GetAllProducts);
//create new product
router.post('/create', CreateProduct);
//get specific product
router.get('/:id', GetProduct);

// ADMIN_API routes below
//update a product
router.patch('/:id', checkAuthrozation('ADMIN_API'), UpdateProduct);
//delete a product
router.delete('/:id', checkAuthrozation('ADMIN_API'), DeleteProduct);

module.exports = router;