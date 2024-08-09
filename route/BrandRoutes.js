const express = require('express');
const {
    CreateBrand,
    GetAllBrands,
    UpdateBrandName,
    DeleteBrand
} = require('../controller/BrandController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authrozation');

//secure routes below
router.use(requireAuth);

// SHARED_API routes below
//get all brands
router.get('/', GetAllBrands);
//create new brand
router.post('/create', CreateBrand);

// ADMIN_API routes below
//update existing brand name
router.patch('/:id', checkAuthrozation('ADMIN_API'), UpdateBrandName);
//delete a brand
router.delete('/:id', checkAuthrozation('ADMIN_API'), DeleteBrand);

module.exports = router;