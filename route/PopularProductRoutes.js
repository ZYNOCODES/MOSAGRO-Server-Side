const express = require('express');
const {
    GetAllPopularProductbyStore,
    AddPopularProduct,
    RemovePopularProduct
} = require('../controller/PopularProductController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');

//secure routes below
router.use(requireAuth);
//get all PopularProduct
router.get('/:id', GetAllPopularProductbyStore);
//create new PopularProduct
router.post('/', AddPopularProduct);
//delete a product from PopularProduct
router.patch('/:id', RemovePopularProduct);

module.exports = router;