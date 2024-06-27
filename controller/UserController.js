const User = require('../model/UserModel');
const MyStores = require('../model/MyStoresModel');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const StoreService = require('../service/StoreService.js');
const MyStoreService = require('../service/MyStoreService.js');

//fetch all Users
const GetAllUsers = asyncErrorHandler(async (req, res, next) => {
    const Users = await User.find({});
    if(!Users){
        const err = new CustomError('Error while fetching Users', 400);
        return next(err);
    }
    res.status(200).json(Users);
});
//add stores to my store collection
const AddStoreToMyList = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { Store } = req.body;
    //check if all feals are filled
    if(!Store){
        const err = new CustomError('Please fill all fields', 400);
        return next(err);
    }
    //check if store exists
    const store = await StoreService.findStoreById(Store);
    if(!store){
        const err = new CustomError('Store not found', 404);
        return next(err);
    }
    //check if store exists in my list
    const myStores = await MyStoreService.findMyStoresByUser(id);
    if(!myStores){
        //create new myStores
        const newMyStores = await MyStores.create({
            user: id,
            stores: [{
                store: store._id,
                status: 'pending'
            }]
        });
        if(!newMyStores){
            const err = new CustomError('Error while adding store to your list. try again', 400);
            return next(err);
        }
        return res.status(200).json({message: 'Store added to your list successfully, wait for it to be approved from the awner.'});
    }
    // Check if store already in my list
    const isStoreInList = myStores.stores.some(item => item.store.equals(store._id));
    if (isStoreInList) {
        const err = new CustomError('Store already in your list', 400);
        return next(err);
    }
    //add store to my list
    const updatedMyStores = await MyStores.findByIdAndUpdate(myStores._id, {
        $push: {
            stores: {
                store: store._id,
                status: 'pending'
            }
        }
    });
    if (!updatedMyStores) {
        const err = new CustomError('Error while adding store to your list. Try again', 400);
        return next(err);
    }
    res.status(200).json({message: 'Store added to your list successfully'});
});


module.exports = {
    GetAllUsers,
    AddStoreToMyList
}