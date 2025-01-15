const Favorite = require('../model/FavoriteModel');

const checkProductInFavorite = async (userId, storeID, productId) => {
    const existingFav = await Favorite.findOne({
        user: userId,
        store: storeID,
        products: productId
    });
    if (existingFav) {
        return true;
    }
    return false;
};

module.exports = {
    checkProductInFavorite
}