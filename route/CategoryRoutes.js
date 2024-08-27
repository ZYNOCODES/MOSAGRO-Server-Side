const express = require('express');
const {
    CreateCategory,
    GetAllCategorys,
    UpdateCategoryName,
    DeleteCategory
} = require('../controller/CategoryController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');

//secure routes below
router.use(requireAuth);

// SHARED_API routes below
//get all Categorys
router.get('/', GetAllCategorys);

// ADMIN_API routes below
//create new Category
router.post('/create', checkAuthrozation([process.env.ADMIN_TYPE]), CreateCategory);
//update existing Category name
router.patch('/:id', checkAuthrozation([process.env.ADMIN_TYPE]), UpdateCategoryName);
//delete a Category
router.delete('/:id', checkAuthrozation([process.env.ADMIN_TYPE]), DeleteCategory);

module.exports = router;