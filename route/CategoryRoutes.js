const express = require('express');
const {
    CreateCategory,
    AddCategoryToStore,
    GetAllCategorys,
    GetAllCategorysForStore,
    UpdateCategoryName,
    DeleteCategory,
    DeleteCategoryFromStore
} = require('../controller/CategoryController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');
const checkStoreOwnership = require('../middleware/CheckStoreOwnership');

//get all Categorys
router.get('/', GetAllCategorys);

//secure routes below
router.use(requireAuth);

// STORE_API routes below
//get all Categorys for store
router.get('/store/:store', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, GetAllCategorysForStore);
//add Category to store
router.patch('/store/add/:store', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, AddCategoryToStore);
//delete Category from store
router.delete('/store/delete/:store/:category', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, DeleteCategoryFromStore);

// ADMIN_API routes below
//create new Category
router.post('/create', checkAuthrozation([process.env.ADMIN_TYPE]), CreateCategory);
//update existing Category name
router.patch('/:id', checkAuthrozation([process.env.ADMIN_TYPE]), UpdateCategoryName);
//delete a Category
router.delete('/:id', checkAuthrozation([process.env.ADMIN_TYPE]), DeleteCategory);

module.exports = router;