const express = require('express');
const {
    GetAllFavoritebyUser,
    AddFavorite,
    RemoveFavorite
} = require('../controller/FavoriteController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authrozation');

//secure routes below
router.use(requireAuth);

// CLIENT_API routes below
//get all Favorite
router.get('/:id', checkAuthrozation('CLIENT_API'), GetAllFavoritebyUser);
//create new Favorite
router.post('/', checkAuthrozation('CLIENT_API'), AddFavorite);
//delete a product from Favorite
router.patch('/:id', checkAuthrozation('CLIENT_API'), RemoveFavorite);

module.exports = router;