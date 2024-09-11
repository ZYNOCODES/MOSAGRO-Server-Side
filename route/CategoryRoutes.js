const express = require('express');
const {
    CreateCategory,
    GetAllCategorys,
    GetAllCategorysForStore,
    UpdateCategoryName,
    DeleteCategory
} = require('../controller/CategoryController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');

//get all Categorys
router.get('/', GetAllCategorys);

//secure routes below
router.use(requireAuth);

// STORE_API routes below
//get all Categorys for store
router.get('/store/:id', checkAuthrozation([process.env.STORE_TYPE]), GetAllCategorysForStore);

// ADMIN_API routes below
//create new Category
router.post('/create', checkAuthrozation([process.env.ADMIN_TYPE]), CreateCategory);
//update existing Category name
router.patch('/:id', checkAuthrozation([process.env.ADMIN_TYPE]), UpdateCategoryName);
//delete a Category
router.delete('/:id', checkAuthrozation([process.env.ADMIN_TYPE]), DeleteCategory);

module.exports = router;