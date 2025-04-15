const express = require('express');
const {
    CreateBrand,
    GetAllBrands,
    UpdateBrandName,
    DeleteBrand
} = require('../controller/BrandController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');
const checkSubscription = require('../middleware/CheckSubscription');
const { upload } = require('../util/ImageUploader');

//secure routes below
router.use(requireAuth);
router.use(checkSubscription);

// SHARED_API routes below
//get all brands
router.get('/', GetAllBrands);
//create new brand
router.post('/create', upload, CreateBrand);

// ADMIN_API routes below
//update existing brand name
router.patch('/:id', upload, checkAuthrozation([process.env.ADMIN_TYPE]), UpdateBrandName);
//delete a brand
router.delete('/:id', checkAuthrozation([process.env.ADMIN_TYPE]), DeleteBrand);

module.exports = router;