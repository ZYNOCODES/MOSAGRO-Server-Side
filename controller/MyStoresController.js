const MyStores = require('../model/MyStoresModel');
const Store = require('../model/StoreModel');
const mongoose = require('mongoose');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const MyStoreService = require('../service/MyStoreService.js');
const StoreService = require('../service/StoreService.js');

//fetch all MyStores
const GetAllMyStoresbyUser = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    if (!id) {
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    //check if ids is type of mongoose id
    if(!mongoose.Types.ObjectId.isValid(id)){
        const err = new CustomError('Invalid id', 404);
        return next(err);
    }
    //get all MyStores by id user and get only stores.status == 'approved' 
    const myStores = await MyStores.findOne({ 
        user: id, 
        stores: {
            $elemMatch: {
                status: 'approved'
            }
        }
    }).populate({
        path: 'stores.store',
        select: 'storeName storeAddress wilaya'
    });
    
    //filter myStores by status
    myStores.stores = myStores.stores.filter(store => store.status === 'approved');
    
    if(myStores.stores.length <= 0){
        const err = new CustomError('No approved store found for you', 404);
        return next(err);
    }
    res.status(200).json(myStores);
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
    res.status(200).json({message: 'Store added to your list successfully, wait for it to be approved from the awner.'});
});
//delete store from myStores
const DeleteStoreFromMyStores = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { store } = req.body;
    if (!id || !store) {
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    //check if ids is type of mongoose id
    if(!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(store)){
        const err = new CustomError('Invalid id', 404);
        return next(err);
    }
    //check if store already exists
    const myStore = await MyStores.findOne({ 
        user: id,
        stores: {
            $elemMatch: {
                store: store
            }
        }
    });
    if(!myStore){
        const err = new CustomError('Store not found in your list', 400);
        return next(err);
    }
    //delete store from stores array
    const updatedMyStore = await MyStores.updateOne(
        { user: id },
        { $pull: { stores: { store: store } } }
    );
    if(!updatedMyStore){
        const err = new CustomError('Error while deleting store', 400);
        return next(err);
    }
    
    res.status(200).json({message: 'Store deleted successfully'});
});

module.exports = {
    GetAllMyStoresbyUser,
    AddStoreToMyList,
    DeleteStoreFromMyStores
}