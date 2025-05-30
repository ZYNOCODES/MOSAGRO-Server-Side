const mongoose = require('mongoose');
const validator = require('validator');
const Store = require('../model/StoreModel');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const CitiesService = require('../service/CitiesService.js')
const MyStoreService = require('../service/MyStoreService.js')

//fetch all active Stores
const GetAllActiveStores = asyncErrorHandler(async (req, res, next) => {
    const Stores = await Store.find({
        status: 'Active',
    }).select('firstName lastName phoneNumber email wilaya commune storeAddress storeName categories');
    if(!Stores || Stores.length <= 0){
        const err = new CustomError('Aucun magasin trouvé', 404);
        return next(err);
    }
    //get wilaya and commune
    const updatedStores = await Promise.all(Stores.map(async store => {
        const storeObj = store.toObject();
        const wilaya = await CitiesService.findCitiesFRByCodeC(store.wilaya, store.commune);
        storeObj.wilaya = wilaya.wilaya;
        storeObj.commune = wilaya.baladiya;
        return storeObj;
    }));

    res.status(200).json(updatedStores);
});
//fetch all pending Stores
const GetAllPendingStores = asyncErrorHandler(async (req, res, next) => {
    const Stores = await Store.find({
        status: 'En attente',
        password: {$ne: null}
    }).select('firstName lastName phoneNumber email wilaya commune storeAddress storeName');
    if(!Stores || Stores.length <= 0){
        const err = new CustomError('Aucun magasin trouvé', 404);
        return next(err);
    }
    //get wilaya and commune
    const updatedStores = await Promise.all(Stores.map(async store => {
        const storeObj = store.toObject();
        const wilaya = await CitiesService.findCitiesFRByCodeC(store.wilaya, store.commune);
        storeObj.wilaya = wilaya.wilaya;
        storeObj.commune = wilaya.baladiya;
        return storeObj;
    }));
    
    res.status(200).json(updatedStores);
});
//fetch all suspended Stores
const GetAllSuspendedStores = asyncErrorHandler(async (req, res, next) => {
    const Stores = await Store.find({
        status: 'Suspended',
    }).select('firstName lastName phoneNumber email wilaya commune');
    if(!Stores || Stores.length <= 0){
        const err = new CustomError('Aucun magasin trouvé', 404);
        return next(err);
    }
    //get wilaya and commune
    const updatedStores = await Promise.all(Stores.map(async store => {
        const storeObj = store.toObject();
        const wilaya = await CitiesService.findCitiesFRByCodeC(store.wilaya, store.commune);
        storeObj.wilaya = wilaya.wilaya;
        storeObj.commune = wilaya.baladiya;
        return storeObj;
    }));

    res.status(200).json(updatedStores);
});
//fetch all active Stores
const GetAllActiveStoresNonLinkedToAClient = asyncErrorHandler(async (req, res, next) => {
    const { client } = req.params;
    if(!client || !mongoose.Types.ObjectId.isValid(client)){
        const err = new CustomError('Tous les champs obligatoires doivent être remplis', 400);
        return next(err);
    }
    //get linked stores
    const linkedStores = await MyStoreService.findMyStoresByUser(client);
    const linkedStoresIDs = linkedStores.map(store => store.store);
    //get all active stores
    const Stores = await Store.find({
        _id: {$nin: linkedStoresIDs},
        status: 'Active',
    }).select('firstName lastName phoneNumber email wilaya commune storeAddress storeName categories');
    if(!Stores || Stores.length <= 0){
        const err = new CustomError('Aucun magasin trouvé', 404);
        return next(err);
    }
    //get wilaya and commune
    const updatedStores = await Promise.all(Stores.map(async store => {
        const storeObj = store.toObject();
        const wilaya = await CitiesService.findCitiesFRByCodeC(store.wilaya, store.commune);
        storeObj.wilaya = wilaya.wilaya;
        storeObj.commune = wilaya.baladiya;
        return storeObj;
    }));

    res.status(200).json(updatedStores);
});
//fetch specific Store
const GetStore = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    //check if id is valid 
    if(!id || !mongoose.Types.ObjectId.isValid(id)){
        const err = new CustomError('Tous les champs obligatoires doivent être remplis', 400);
        return next(err);
    }
    const store = await Store.findById(id).select(
        'firstName lastName phoneNumber phoneVerification email emailVerification wilaya commune storeAddress storeName storeLocation status r_commerce categories'
    ).populate([
        {
            path: 'categories',
            select: 'name'
        }
    ]);
    if(!store){
        const err = new CustomError('Store non trouvé', 404);
        return next(err);
    }

    const wilaya = await CitiesService.findCitiesFRByCodeC(store.wilaya, store.commune);
    
    const response = {
        ...store.toObject(),
        wilaya: wilaya.wilaya,
        commune: wilaya.baladiya
    };
    
    res.status(200).json(response);
});
//update specific Store info
const UpdateStore = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { firstName, lastName, wilaya, commune, 
        address, storeName, location } = req.body;
    //check if id is valid 
    if(!id || !mongoose.Types.ObjectId.isValid(id)){
        const err = new CustomError('Tous les champs obligatoires doivent être remplis', 400);
        return next(err);
    }
    //check if at least one field is provided
    if(!firstName && !lastName && !wilaya &&
        !commune && !address && !storeName && !location){
        const err = new CustomError('Un des champs optionnels doit être rempli', 400);
        return next(err);
    }
    //validate wilaya and commune
    if(wilaya && !validator.isNumeric(wilaya)){
        const err = new CustomError('Wilaya invalid', 400);
        return next(err);
    }
    if(commune && !validator.isNumeric(commune)){
        const err = new CustomError('Commune invalid', 400);
        return next(err);
    }

    //check wilaya and commune
    if(wilaya && commune){
        const checkWilaya = await CitiesService.findCitiesFRByCodeC(wilaya, commune);
        if(!checkWilaya){
            const err = new CustomError('Wilaya or commune invalid', 400);
            return next(err);
        }
    }else if(!wilaya && commune){
        const err = new CustomError('Wilaya est requis', 400);
        return next(err);
    }else if(!commune && wilaya){
        const err = new CustomError('Commune est requis', 400);
        return next(err);
    } 
    //update Store
    const store = await Store.findOne({_id: id});
    if(!store){
        const err = new CustomError('Store non trouvé', 404);
        return next(err);
    }
    
    //update Store info
    if(firstName) store.firstName = firstName;
    if(lastName) store.lastName = lastName;
    if(wilaya) store.wilaya = wilaya;
    if(commune) store.commune = commune;
    if(address) store.storeAddress = address;
    if(storeName) store.storeName = storeName;
    if(location) store.storeLocation = location;
    
    //save updated Store
    const updatedStore = await store.save();
    if(!updatedStore){
        const err = new CustomError('Erreur lors de la mise à jour du magasin', 500);
        return next(err);
    }
    res.status(200).json({message: 'Magasin mis à jour avec succès'});
});

module.exports = {
    GetAllActiveStores,
    GetAllPendingStores,
    GetAllSuspendedStores,
    GetAllActiveStoresNonLinkedToAClient,
    GetStore,
    UpdateStore
}