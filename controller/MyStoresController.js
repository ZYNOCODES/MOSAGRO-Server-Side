const MyStores = require('../model/MyStoresModel');
const mongoose = require('mongoose');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const CitiesService = require('../service/CitiesService.js')
const StoreService = require('../service/StoreService.js');
const ClientService = require('../service/ClientService.js');

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
    const myStores = await MyStores.find({ 
        user: id, 
        status: 'approved'
    }).populate({
        path: 'store',
        select: 'storeName storeAddress wilaya'
    });
    
    //check
    if(myStores.length <= 0){
        const err = new CustomError('No approved store found for you', 404);
        return next(err);
    }
    res.status(200).json(myStores);
});
//fetch all approved users by store
const GetAllUsersByStore = asyncErrorHandler(async (req, res, next) => {
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
    const myUsers = await MyStores.find({ 
        status: 'approved',
        isSeller: false,
        store: id
    }).populate({
        path:'user',
        select: '_id firstName lastName phoneNumber wilaya commune',
    });

    //check if myUsers is empty
    if(myUsers.length <= 0){
        const err = new CustomError('No user found for this store', 404);
        return next(err);
    }
    
    // Populate wilaya and commune manually
    const populatedUsers = await Promise.all(myUsers.map(async (user) => {
        const wilaya = await CitiesService.findCitiesFRByCodeC(user.user.wilaya, user.user.commune);

        return {
            ...user.toObject(),
            user: {
                ...user.user.toObject(),
                wilaya: wilaya.wilaya,
                commune: wilaya.baladiya,
            }
        };
    }));

    res.status(200).json(populatedUsers);
});
//fecth all not approved users by store
const GetAllNotApprovedUsersByStore = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    //get all MyStores by id user and get only stores.status == 'approved' || 'rejected'
    const myUsers = await MyStores.find({
        status: { $ne: 'approved' },
        store: id,
        isSeller: false
    }).populate({
        path: 'user',
        select: '_id firstName lastName phoneNumber wilaya commune storeAddresses'
    });
    //check if myUsers is empty
    if(myUsers.length <= 0){
        const err = new CustomError('No user found for this store', 404);
        return next(err);
    }
    
    // Populate wilaya and commune manually
    const populatedUsers = await Promise.all(myUsers.map(async (user) => {
        const wilaya = await CitiesService.findCitiesFRByCodeC(user.user.wilaya, user.user.commune);

        return {
            ...user.toObject(),
            user: {
                ...user.user.toObject(),
                wilaya: wilaya.wilaya,
                commune: wilaya.baladiya,
            }
        };
    }));

    res.status(200).json(populatedUsers);
});
//fetch all sellers users by store
const GetAllSellersUsersByStore = asyncErrorHandler(async (req, res, next) => {
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
    const myUsers = await MyStores.find({ 
        status: 'approved',
        store: id,
        isSeller: true
    }).populate({
        path:'user',
        select: '_id firstName lastName phoneNumber wilaya commune'
    });
    //check if myUsers is empty
    if(myUsers.length <= 0){
        const err = new CustomError('No seller found', 404);
        return next(err);
    }
    
    // Populate wilaya and commune manually
    const populatedUsers = await Promise.all(myUsers.map(async (user) => {
        const wilaya = await CitiesService.findCitiesFRByCodeC(user.user.wilaya, user.user.commune);

        return {
            ...user.toObject(),
            user: {
                ...user.user.toObject(),
                wilaya: wilaya.wilaya,
                commune: wilaya.baladiya,
            }
        };
    }));

    res.status(200).json(populatedUsers);
});
//add stores to my store collection
const AddStoreToMyList = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { Store } = req.body;
    //check if all feals are filled
    if(!Store || !id){
        const err = new CustomError('Please fill all fields', 400);
        return next(err);
    }

    //check if store exists
    const client = await ClientService.findClientById(id);
    if (!client) {
        await session.abortTransaction();
        session.endSession();
        return next(new CustomError('Client not found', 404));
    }

    //check if store exists
    const store = await StoreService.findStoreById(Store);
    if (!store) {
        await session.abortTransaction();
        session.endSession();
        return next(new CustomError('Store not found', 404));
    }

    //check if store already exists
    const myStore = await MyStores.findOne({ 
        user: client._id,
        store: store._id
    });
    if(myStore){
        const err = new CustomError('Store already exists in your list', 400);
        return next(err);
    }

    //create new myStores
    const newMyStore = await MyStores.create({
        user: client._id,
        store: store._id,
        status: 'pending'
    });

    if (!newMyStore) {
        const err = new CustomError('Error while adding store', 400);
        return next(err);
    }

    res.status(200).json({ message: 'Store added to your list successfully, wait for it to be approved by the owner.' });
});
//approve user to access store by setting stores.status == 'approved'
const ApproveUserToAccessStore = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { user } = req.body;
    if (!id || !user || !mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(user)) {
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    //check if store already exists
    const myStore = await MyStores.findOne({ 
        user: user,
        store: id
    });
    if(!myStore){
        const err = new CustomError('User not found in your list', 400);
        return next(err);
    }
    //check if user is already approved in store
    if(myStore.status == 'approved'){
        const err = new CustomError('User already approved', 400);
        return next(err);
    }
    //approve user to access store
    myStore.status = 'approved';
    const updatedMyStore = await myStore.save();
    if(!updatedMyStore){
        const err = new CustomError('Error while approving user', 400);
        return next(err);
    }
    res.status(200).json({message: 'User approved successfully'});
});
//reject user to access store by setting stores.status == 'rejected'
const RejectUserToAccessStore = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { user } = req.body;
    if (!id || !user || !mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(user)) {
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    //check if store already exists
    const myStore = await MyStores.findOne({ 
        user: user,
        store: id
    });
    if(!myStore){
        const err = new CustomError('User not found in your list', 400);
        return next(err);
    }
    //check if user is already approved in store
    if(myStore.status == 'rejected'){
        const err = new CustomError('User already rejected', 400);
        return next(err);
    }
    //approve user to access store
    myStore.status = 'rejected';
    const updatedMyStore = await myStore.save();
    if(!updatedMyStore){
        const err = new CustomError('Error while rejecting user', 400);
        return next(err);
    }
    res.status(200).json({message: 'User rejected successfully'});
});
//make a user a seller
const MakeUserSeller = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { user } = req.body;
    if (!id || !user || !mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(user)) {
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    //check if store already exists
    const myStore = await MyStores.findOne({ 
        user: user,
        store: id,
        status: 'approved'
    });
    if(!myStore){
        const err = new CustomError('User not found in your list', 400);
        return next(err);
    }
    //check if user is already approved in store
    if(myStore.isSeller){
        const err = new CustomError('User already a seller', 400);
        return next(err);
    }
    //approve user to access store
    myStore.isSeller = true;
    const updatedMyStore = await myStore.save();
    if(!updatedMyStore){
        const err = new CustomError('Error while making user a seller', 400);
        return next(err);
    }
    res.status(200).json({message: 'User is now a seller'});
});
//delete store from myStores
const DeleteStoreFromMyStores = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    const { client } = req.body;
    if (!client || !store) {
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    //check if ids is type of mongoose id
    if(!mongoose.Types.ObjectId.isValid(client) || !mongoose.Types.ObjectId.isValid(store)){
        const err = new CustomError('Invalid id', 404);
        return next(err);
    }
    //check if store already exists
    const myStore = await MyStores.findOne({ 
        user: client,
        store: store
    });
    if(!myStore){
        const err = new CustomError('Store not found in your list', 400);
        return next(err);
    }
    //delete store from stores array
    const deletedMyStore = await myStore.deleteOne();
    if(!deletedMyStore){
        const err = new CustomError('Error while deleting store', 400);
        return next(err);
    }
    
    res.status(200).json({message: 'Store deleted successfully'});
});

module.exports = {
    GetAllMyStoresbyUser,
    GetAllUsersByStore,
    GetAllNotApprovedUsersByStore,
    GetAllSellersUsersByStore,
    AddStoreToMyList,
    ApproveUserToAccessStore,
    RejectUserToAccessStore,
    MakeUserSeller,
    DeleteStoreFromMyStores
}