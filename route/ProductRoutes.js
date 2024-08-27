const express = require('express');
const {
    CreateProduct,
    GetAllProducts,
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
//get all products
router.get('/', GetAllProducts);
//create new product
router.post('/create', upload, CreateProduct);
//get specific product
router.get('/:id', GetProduct);

// ADMIN_API routes below
//update a product
router.patch('/:id', checkAuthrozation([process.env.ADMIN_TYPE]), UpdateProduct);
//delete a product
router.delete('/:id', checkAuthrozation([process.env.ADMIN_TYPE]), DeleteProduct);

module.exports = router;