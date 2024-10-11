const express = require('express');
const {
    CreateProduct,
    GetAllProducts,
    GetAllProductsByCategoryStore,
    GetProduct,
    UpdateProduct,
    DeleteProduct
} = require('../controller/ProductController');
const router = express.Router();
const { upload } = require('../util/ImageUploader');
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');

//secure routes below
router.use(requireAuth);

// SHARED_API routes below
//create new product
router.post('/create', upload, checkAuthrozation([process.env.ADMIN_TYPE, process.env.STORE_TYPE]), CreateProduct);
//get specific product
router.get('/:id', checkAuthrozation([process.env.ADMIN_TYPE, process.env.STORE_TYPE, process.env.CLIENT_TYPE]), GetProduct);

// STORE_API routes below
//get all products by category
router.get('/store/:id', checkAuthrozation([process.env.STORE_TYPE]), GetAllProductsByCategoryStore);

// ADMIN_API routes below
//get all products
router.get('/', checkAuthrozation([process.env.ADMIN_TYPE]), GetAllProducts);
//update a product
router.patch('/:id', upload, checkAuthrozation([process.env.ADMIN_TYPE]), UpdateProduct);
//delete a product
router.delete('/:id', checkAuthrozation([process.env.ADMIN_TYPE]), DeleteProduct);

module.exports = router;