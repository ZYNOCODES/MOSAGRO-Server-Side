const express = require('express');
const {
    CreateProduct,
    GetAllProducts
} = require('../controller/ProductController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');

//secure routes below
//router.use(requireAuth);
//get all products
router.get('/', GetAllProducts);
//create new product
router.post('/create', CreateProduct);

module.exports = router;