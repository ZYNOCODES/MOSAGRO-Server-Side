const express = require('express');
const {
    GetAllPublicitybyStore,
    AddPublicity,
    RemovePublicity,
    GetAllPublicPublicities,
    ChangePublicityDistination
} = require('../controller/PublicityController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');

//secure routes below
router.use(requireAuth);

// SHARED_API routes below
//fetch all Publicity
router.get('/:id', GetAllPublicitybyStore);

// STORE_API routes below
//add Publicity
router.post('/', checkAuthrozation([process.env.STORE_TYPE]), AddPublicity);
//remove Publicity
router.patch('/:id', checkAuthrozation([process.env.STORE_TYPE]), RemovePublicity);

// CLIENT_API routes below
//fetch all public Publicities
router.get('/', checkAuthrozation([process.env.CLIENT_TYPE]), GetAllPublicPublicities);

// ADMIN_API routes below
//update Publicity distination
router.patch('/distination/:id', checkAuthrozation([process.env.ADMIN_TYPE]), ChangePublicityDistination);

module.exports = router;