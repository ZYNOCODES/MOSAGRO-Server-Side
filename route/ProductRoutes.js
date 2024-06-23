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

//secure routes below
router.use(requireAuth);
//get all products
router.get('/', GetAllProducts);
//create new product
router.post('/create', CreateProduct);
//get specific product
router.get('/:id', GetProduct);
//update a product
router.patch('/:id', UpdateProduct);
//delete a product
router.delete('/:id', DeleteProduct);

module.exports = router;