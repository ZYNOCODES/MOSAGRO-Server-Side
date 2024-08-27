const express = require('express');
const {
    GetAllFavoritebyUser,
    AddFavorite,
    RemoveFavorite
} = require('../controller/FavoriteController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');

//secure routes below
router.use(requireAuth);

// CLIENT_API routes below
//get all Favorite
router.get('/:id', checkAuthrozation([process.env.CLIENT_TYPE]), GetAllFavoritebyUser);
//create new Favorite
router.post('/', checkAuthrozation([process.env.CLIENT_TYPE]), AddFavorite);
//delete a product from Favorite
router.patch('/:id', checkAuthrozation([process.env.CLIENT_TYPE]), RemoveFavorite);

module.exports = router;