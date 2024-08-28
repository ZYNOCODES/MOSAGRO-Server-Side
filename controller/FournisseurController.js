const mongoose = require('mongoose');
const validator = require('validator');
const Fournisseur = require('../model/FournisseurModel.js');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const FournisseurService = require('../service/FournisseurService.js')
const StoreService = require('../service/StoreService.js')
const CitiesService = require('../service/CitiesService.js')

//create a new Fournisseur
const CreateFournisseur = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    const { firstname, lastname, phone, address, wilaya, commune } = req.body;
    // check if all required fields are provided
    if(!store || !mongoose.Types.ObjectId.isValid(store) || !firstname || !lastname || !phone
        || !wilaya || !commune
    ){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    // check phone number
    if(phone && !validator.isMobilePhone(phone)){
        const err = new CustomError('Enter a valid phone number', 400);
        return next(err);
    }

    //check if the store exist
    const existStore = await StoreService.findStoreById(store);
    if(!existStore){
        const err = new CustomError('Store non trouvé', 404);
        return next(err);
    }

    //check if the phone number already used
    const existPhone = await FournisseurService.findFournisseurByPhone(phone, existStore._id);
    if(existPhone){
        const err = new CustomError('An existing fournisseur is using this phone number. Try again with another one.', 400);
        return next(err);
    }

    //check if the wilaya and commun exist
    const existWilaya = await CitiesService.findCitiesFRByCodeC(wilaya, commune);
    if(!existWilaya){
        const err = new CustomError('the wilaya and its commune is incorrect', 404);
        return next(err);
    }

    //create a new Fournisseur
    const newFournisseur = await Fournisseur.create({
        firstName: firstname,
        lastName: lastname,
        phoneNumber: phone,
        store: existStore._id,
        address: address ? address : '',
        wilaya: wilaya,
        commune: commune
    });

    //check if Fournisseur created successfully
    if(!newFournisseur){
        const err = new CustomError('Error while creating fournisseur try again.', 400);
        return next(err);
    }
    res.status(200).json({message: 'Fournisseur created successfully'});
});

//fetch a specific Fournisseur
const GetFournisseurByID = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    if(!id || !mongoose.Types.ObjectId.isValid(id)){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }

    //get all Fournisseurs by store
    const fournisseur = await Fournisseur.findById(id);

    //check if Fournisseurs found
    if(!fournisseur){
        const err = new CustomError('Fournisseur not found', 404);
        return next(err);
    }

    const wilaya = await CitiesService.findCitiesFRByCodeC(fournisseur.wilaya, fournisseur.commune);

    const response = {
        ...fournisseur.toObject(),
        wilaya: wilaya.wilaya,
        commune: wilaya.baladiya
    };

    res.status(200).json(response);
});

//fetch all Fournisseurs
const GetAllFournisseurs = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    // check if all required fields are provided
    if(!store || !mongoose.Types.ObjectId.isValid(store)){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }

    //check if the store exist
    const existStore = await StoreService.findStoreById(store);
    if(!existStore){
        const err = new CustomError('Store not found', 404);
        return next(err);
    }

    //get all fournisseurs by store
    const fournisseurs = await Fournisseur.find({
        store: store
    });
    //check if fournisseurs found
    if(!fournisseurs || fournisseurs.length < 1){
        const err = new CustomError('No fournisseur found', 400);
        return next(err);
    }
    
    // Populate wilaya and commune manually
    const populatedFournisseurs = await Promise.all(fournisseurs.map(async (fournisseur) => {
        const wilaya = await CitiesService.findCitiesFRByCodeC(fournisseur.wilaya, fournisseur.commune);

        return {
            ...fournisseur.toObject(),
            wilaya: wilaya.wilaya,
            commune: wilaya.baladiya,
        };
    }));

    res.status(200).json(populatedFournisseurs);
});

//update Fournisseur
const UpdateFournisseur = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    const { id, firstname, lastname, phone, address, wilaya, commune } = req.body;

    // Check if at least one field is provided
    if ((!id || !mongoose.Types.ObjectId.isValid(id) || !store || !mongoose.Types.ObjectId.isValid(store)) ||
        (!firstname && !lastname && !phone && !address && !wilaya && !commune)) {
        const err = new CustomError('One of the fields is required at least', 400);
        return next(err);
    }
    // check phone number
    if(phone && !validator.isMobilePhone(phone)){
        const err = new CustomError('Enter a valid phone number', 400);
        return next(err);
    }

    //check if the store exist
    const existStore = await StoreService.findStoreById(store);
    if(!existStore){
        const err = new CustomError('Magasin non trouvé', 404);
        return next(err);
    }

    // Check if Fournisseur exists
    const existFournisseur = await FournisseurService.findFournisseurByIdANDStore(id, existStore._id);
    if(!existFournisseur){
        const err = new CustomError('Fournisseur not found', 404);
        return next(err);
    }

    //check if the phone number already used
    if(phone){
        const existPhone = await FournisseurService.findFournisseurByPhone(phone, existStore._id);
        if(existPhone){
            const err = new CustomError('An existing fournisseur use that phone number. try again with another.', 400);
            return next(err);
        }
    }

    //check if the wilaya and commun exist
    if(wilaya && commune){
        const existWilaya = await CitiesService.findCitiesFRByCodeC(wilaya, commune);
        if(!existWilaya){
            const err = new CustomError('La wilaya et sa commune est incorrecte', 404);
            return next(err);
        }
    }

    // Prepare update fields
    if (firstname) existFournisseur.firstName = firstname;
    if (lastname) existFournisseur.lastName = lastname;
    if (phone) existFournisseur.phoneNumber = phone;
    if (address) existFournisseur.address = address;
    if (wilaya) existFournisseur.wilaya = wilaya;
    if (commune) existFournisseur.commune = commune;

    // Update Fournisseur
    const updatedFournisseur = await existFournisseur.save();

    // Check if Fournisseur updated successfully
    if (!updatedFournisseur) {
        const err = new CustomError('Error while updating Fournisseur, try again.', 400);
        return next(err);
    }

    res.status(200).json({ message: 'Fournisseur updated successfully' });
});

//delete Fournisseur
const DeleteFournisseur = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    // check if all required fields are provided
    if(!id || !mongoose.Types.ObjectId.isValid(id)){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }

    // Check if Fournisseur exists
    const existFournisseur = await FournisseurService.findFournisseurById(id);
    if(!existFournisseur){
        const err = new CustomError('Fournisseur not found', 404);
        return next(err);
    }

    //delete Fournisseur
    const deletedFournisseur = await Fournisseur.deleteOne({_id: existFournisseur._id});
    //check if Fournisseur deleted successfully
    if(!deletedFournisseur){
        const err = new CustomError('Error while deleting fournisseur try again.', 400);
        return next(err);
    }
    res.status(200).json({message: 'Fournisseur deleted successfully'});
});

module.exports = {
    CreateFournisseur,
    GetFournisseurByID,
    GetAllFournisseurs,
    UpdateFournisseur,
    DeleteFournisseur
}