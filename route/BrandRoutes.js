const express = require('express');
const {
    CreateBrand,
    GetAllBrands,
    UpdateBrandName,
    DeleteBrand
} = require('../controller/BrandController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');

//secure routes below
router.use(requireAuth);
//get all brands
router.get('/', GetAllBrands);
//create new brand
router.post('/create', CreateBrand);
//update existing brand name
router.patch('/:id', UpdateBrandName);
//delete a brand
router.delete('/:id', DeleteBrand);

module.exports = router;