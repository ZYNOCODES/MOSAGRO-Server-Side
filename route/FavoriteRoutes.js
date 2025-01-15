const express = require('express');
const {
    GetAllFavoriteStoresbyClient,
    GetFavoriteProductsById,
    AddFavorite,
    RemoveFavorite
} = require('../controller/FavoriteController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');
const checkClientOwnership = require('../middleware/CheckClientOwnership');

//secure routes below
router.use(requireAuth);

// CLIENT_API routes below
//get all Favorite by client
router.get('/:id', checkAuthrozation([process.env.CLIENT_TYPE]), checkClientOwnership, GetAllFavoriteStoresbyClient);
//get Favorite by id
router.get('/products/:id', checkAuthrozation([process.env.CLIENT_TYPE]), GetFavoriteProductsById);
//create new Favorite
router.post('/:id', checkAuthrozation([process.env.CLIENT_TYPE]), checkClientOwnership, AddFavorite);
//delete a product from Favorite
router.patch('/:id', checkAuthrozation([process.env.CLIENT_TYPE]), checkClientOwnership, RemoveFavorite);

module.exports = router;