const express = require('express');
const {
    GetAllFavoritebyUser,
    AddFavorite,
    RemoveFavorite
} = require('../controller/FavoriteController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');

//secure routes below
router.use(requireAuth);
//get all Favorite
router.get('/:id', GetAllFavoritebyUser);
//create new Favorite
router.post('/', AddFavorite);
//delete a product from Favorite
router.patch('/:id', RemoveFavorite);

module.exports = router;