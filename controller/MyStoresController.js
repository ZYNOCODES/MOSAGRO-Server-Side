const MyStores = require('../model/MyStoresModel');
const mongoose = require('mongoose');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const CitiesService = require('../service/CitiesService.js')
const StoreService = require('../service/StoreService.js');
const ClientService = require('../service/ClientService.js');
const NotificationService = require('../service/NotificationService.js');
const validator = require('validator');

//fetch all MyStores
const GetAllMyStoresbyUser = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    //get all MyStores by id user and get only stores.status == 'approved' 
    const myStores = await MyStores.find({ 
        user: id, 
        status: 'approved'
    }).populate({
        path: 'store',
        select: 'storeName storeAddress wilaya commune categories',
        populate: {
            path: 'categories',
            select: '_id name',
        },
    });
    
    //check
    if(myStores.length <= 0){
        const err = new CustomError('Aucun magasin approuvé n\'a été trouvé pour vous', 404);
        return next(err);
    }

    // Populate wilaya and commune manually
    const populatedmyStores = await Promise.all(myStores.map(async (myStore) => {
        const wilaya = await CitiesService.findCitiesFRByCodeC(myStore.store.wilaya, myStore.store.commune);

        return {
            ...myStore.toObject(),
            store: {
                ...myStore.store.toObject(),
                wilaya: wilaya.wilaya,
                commune: wilaya.baladiya,
            }
        };
    }));
    
    res.status(200).json(populatedmyStores);
});
//fetch all MyStores
const GetAllNonActiveMyStoresbyUser = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    //get all MyStores by id user and get only stores.status == 'approved' 
    const myStores = await MyStores.find({ 
        user: id, 
        status: { $in: ['pending', 'rejected'] }
    }).populate({
        path: 'store',
        select: 'storeName storeAddress wilaya commune categories',
        populate: {
            path: 'categories',
            select: '_id name',
        },
    });
    
    //check
    if(myStores.length <= 0){
        const err = new CustomError('Aucun magasin approuvé n\'a été trouvé pour vous', 404);
        return next(err);
    }

    // Populate wilaya and commune manually
    const populatedmyStores = await Promise.all(myStores.map(async (myStore) => {
        const wilaya = await CitiesService.findCitiesFRByCodeC(myStore.store.wilaya, myStore.store.commune);

        return {
            ...myStore.toObject(),
            store: {
                ...myStore.store.toObject(),
                wilaya: wilaya.wilaya,
                commune: wilaya.baladiya,
            }
        };
    }));
    
    res.status(200).json(populatedmyStores);
});
//fetch all approved users by store
const GetAllUsersByStore = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        const err = new CustomError('Tous les champs sont obligatoires', 400);
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
        const err = new CustomError('Aucun client trouvé pour ce magasin', 404);
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
        const err = new CustomError('Tous les champs sont obligatoires', 400);
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
        const err = new CustomError('Aucun client trouvé pour ce magasin', 404);
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
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        const err = new CustomError('Tous les champs sont obligatoires', 400);
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
        const err = new CustomError('Aucun vendeur trouvé', 404);
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
    const { store } = req.body;

    // Check if all fields are filled and store ID is valid
    if (!store || !mongoose.Types.ObjectId.isValid(store)) {
        return next(new CustomError('Tous les champs sont obligatoires', 400));
    }

    // Check if store exists
    const existingStore = await StoreService.findStoreById(store);
    if (!existingStore) {
        return next(new CustomError('Magasin non trouvé', 404));
    }

    // Check if store is already in the user's list
    const myStore = await MyStores.findOne({ 
        user: id,
        store: existingStore._id
    });
    if (myStore) {
        return next(new CustomError('Le magasin existe déjà dans votre liste', 400));
    }

    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Create new MyStores entry
        const newMyStore = await MyStores.create([{
            user: id,
            store: existingStore._id,
            status: 'pending'
        }], { session });

        if (!newMyStore || !newMyStore[0]) {
            throw new CustomError('Erreur lors de l\'ajout du magasin à la liste des clients', 400);
        }
        //message to send
        const msg = 'Vous avez une nouvelle demande d\'accès client, vérifiez-la dans votre page d\'authentification utilisateur';
        // Create new notification
        const newNotification = await NotificationService.createNewNotificationForStore(
            existingStore._id,
            'store_access_request',
            msg,
            session
        );

        if (!newNotification || !newNotification[0]) {
            throw new CustomError('Erreur lors de la création d\'une nouvelle notification, réessayez', 400);
        }

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ 
            message: 'Le magasin a été ajouté à votre liste avec succès, attendez qu\'il soit approuvé par le propriétaire.' 
        });

    } catch (error) {
        // Abort transaction on error
        await session.abortTransaction();
        session.endSession();
        next(new CustomError('Erreur lors de l\'ajout du magasin à la liste des clients', 500));
        console.log(error);
    }
});
//approve user to access store by setting stores.status == 'approved'
const ApproveUserToAccessStore = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { user } = req.body;
    if (!id || !user || !mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(user)) {
        const err = new CustomError('Tous les champs sont obligatoires', 400);
        return next(err);
    }
    //check if store already exists
    const myStore = await MyStores.findOne({ 
        user: user,
        store: id
    }).populate({
        path: 'store',
        select: 'storeName'
    });
    if(!myStore){
        const err = new CustomError('Client non trouvé dans votre liste', 400);
        return next(err);
    }
    //check if user is already approved in store
    if(myStore.status == 'approved'){
        const err = new CustomError('Client déjà approuvé', 400);
        return next(err);
    }
    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        //approve user to access store
        myStore.status = 'approved';
        const updatedMyStore = await myStore.save({ session });
        if(!updatedMyStore){
            await session.abortTransaction();
            session.endSession();
            const err = new CustomError('Erreur lors de l\'approbation du client', 400);
            return next(err);
        }
        // message to send 
        const msg = `Vous avez été autorisé à accéder à le magasin ${myStore.store.storeName}`;
        // Create new notification
        const newNotification = await NotificationService.createNewNotificationForClient(
            user,
            'store_access_approved',
            msg,
            session
        );
        if (!newNotification || !newNotification[0]) {
            await session.abortTransaction();
            session.endSession();
            const err = new CustomError('Erreur lors de la création d\'une nouvelle notification, réessayez', 400);
            return next(err);
        }
        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({message: 'Client approuvé avec succès'});
    }catch (error) {
        // Abort transaction on error
        await session.abortTransaction();
        session.endSession();
        next(new CustomError('Erreur lors de l\'approbation du client', 500));
        console.log(error);
    }
});
//reject user to access store by setting stores.status == 'rejected'
const RejectUserToAccessStore = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { user } = req.body;
    if (!id || !user || !mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(user)) {
        const err = new CustomError('Tous les champs sont obligatoires', 400);
        return next(err);
    }
    //check if store already exists
    const myStore = await MyStores.findOne({ 
        user: user,
        store: id
    });
    if(!myStore){
        const err = new CustomError('Client non trouvé dans votre liste', 400);
        return next(err);
    }
    //check if user is already approved in store
    if(myStore.status == 'rejected'){
        const err = new CustomError('Le client a déjà été rejeté', 400);
        return next(err);
    }
    //approve user to access store
    myStore.status = 'rejected';
    const updatedMyStore = await myStore.save();
    if(!updatedMyStore){
        const err = new CustomError('Erreur lors du rejet du client', 400);
        return next(err);
    }
    res.status(200).json({message: 'Client rejeté avec succès'});
});
//make a user a seller
const MakeUserSeller = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { user, isSeller } = req.body;
    if (!id || !user || isSeller == null ||
        !mongoose.Types.ObjectId.isValid(id) || 
        !mongoose.Types.ObjectId.isValid(user) ||
        !validator.isBoolean(isSeller.toString())
    ) {
        const err = new CustomError('Tous les champs sont obligatoires', 400);
        return next(err);
    }
    //check if store already exists
    const myStore = await MyStores.findOne({ 
        user: user,
        store: id,
        status: 'approved'
    });
    if(!myStore){
        const err = new CustomError('Client non trouvé dans votre liste', 400);
        return next(err);
    }
    //check if user is already approved in store
    if(myStore.isSeller == true && isSeller == true){
        const err = new CustomError('Client déjà vendeur', 400);
        return next(err);
    }else if(myStore.isSeller == false && isSeller == false){
        const err = new CustomError('Le client n\'est déjà pas vendeur', 400);
        return next(err);
    }

    //approve user to access store
    myStore.isSeller = isSeller;
    const updatedMyStore = await myStore.save();
    if(!updatedMyStore){
        const err = new CustomError('Erreur lors de la mise à jour de l\'option du vendeur du client', 400);
        return next(err);
    }
    res.status(200).json({message: `${myStore.isSeller ? 
        'Le client est désormais un vendeur' :
        'Le client est désormais un simple client'
    }`});
});
//add addresse to a user
const AddNewAddressToUser = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    const { user, address, name } = req.body;
    if (!user || !address || !name ||
        !mongoose.Types.ObjectId.isValid(user) ||
        validator.isEmpty(address.toString())
    ) {
        const err = new CustomError('Tous les champs sont obligatoires', 400);
        return next(err);
    }

    //check if user already exists
    const existingUser = await ClientService.findClientById(user);
    if(!existingUser){
        const err = new CustomError('Client non trouvé', 404);
        return next(err);
    }

    //check if store already exists
    const myStore = await MyStores.findOne({ 
        user: existingUser._id,
        store: store,
    });
    if(!myStore){
        const err = new CustomError('Client non trouvé dans votre liste', 400);
        return next(err);
    }

    //check if address already exists
    const addressExists = existingUser.storeAddresses.find((add) => 
        add.address == address && add.name == name
    );
    if(addressExists){
        const err = new CustomError('L\'adresse existe déjà avec ce nom et cette adresse', 400);
        return next(err);
    }
    //push new address to user
    existingUser.storeAddresses.push({
        name: name,
        address: address,
        location: null
    });

    //save user
    const updatedUser = await existingUser.save();
    if(!updatedUser){
        const err = new CustomError('Erreur lors de l\'ajout de l\'adresse au client', 400);
        return next(err);
    }
    res.status(200).json({message: 'Adresse ajoutée avec succès'});
});
//delete store from myStores
const DeleteStoreFromMyStores = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    const { client } = req.body;
    if (!client || !store || !mongoose.Types.ObjectId.isValid(client) || !mongoose.Types.ObjectId.isValid(store)) {
        const err = new CustomError('Tous les champs sont obligatoires', 400);
        return next(err);
    }
    //check if store already exists
    const myStore = await MyStores.findOne({ 
        user: client,
        store: store
    });
    if(!myStore){
        const err = new CustomError('Magasin non trouvé dans votre liste', 400);
        return next(err);
    }
    //delete store from stores array
    const deletedMyStore = await myStore.deleteOne();
    if(!deletedMyStore){
        const err = new CustomError('Erreur lors de la suppression du magasin', 400);
        return next(err);
    }
    
    res.status(200).json({message: 'Le magasin a été supprimé avec succès'});
});

module.exports = {
    GetAllMyStoresbyUser,
    GetAllNonActiveMyStoresbyUser,
    GetAllUsersByStore,
    GetAllNotApprovedUsersByStore,
    GetAllSellersUsersByStore,
    AddStoreToMyList,
    ApproveUserToAccessStore,
    RejectUserToAccessStore,
    MakeUserSeller,
    DeleteStoreFromMyStores,
    AddNewAddressToUser
}