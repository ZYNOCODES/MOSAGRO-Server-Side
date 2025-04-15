const mongoose = require('mongoose');
const User = require('../model/UserModel');
const MyStores = require('../model/MyStoresModel');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const CitiesService = require('../service/CitiesService.js');
const validator = require('validator');
const UserService = require('../service/UserService.js');
const bcrypt = require('../util/bcrypt.js');

//fetch all Clients unverified
const GetAllClientsUnverified = asyncErrorHandler(async (req, res, next) => {
    const Users = await User.find({
        isRCVerified: false,
        isBlocked: false
    }).select('firstName lastName phoneNumber wilaya commune r_commerce email isRCVerified isBlocked');
    if(!Users || Users.length <= 0){
        const err = new CustomError('No client found', 404);
        return next(err);
    }
    //for each user, get the wilaya and commune
    const response = await Promise.all(Users.map(async (user) => {
        const wilaya = await CitiesService.findCitiesFRByCodeC(user.wilaya, user.commune);
        return {
            ...user.toObject(),
            wilaya: wilaya.wilaya,
            commune: wilaya.baladiya
        }
    }));
    res.status(200).json(response);
});
//fetch all Clients blocked
const GetAllClientsBlocked = asyncErrorHandler(async (req, res, next) => {
    const Users = await User.find({
        isBlocked: true
    }).select('firstName lastName phoneNumber wilaya commune r_commerce email isRCVerified isBlocked');
    if(!Users || Users.length <= 0){
        const err = new CustomError('No client found', 404);
        return next(err);
    }
    //for each user, get the wilaya and commune
    const response = await Promise.all(Users.map(async (user) => {
        const wilaya = await CitiesService.findCitiesFRByCodeC(user.wilaya, user.commune);
        return {
            ...user.toObject(),
            wilaya: wilaya.wilaya,
            commune: wilaya.baladiya
        }
    }));
    res.status(200).json(response);
});
//fetch all clients verified
const GetAllClientsVerified = asyncErrorHandler(async (req, res, next) => {
    const Users = await User.find({
        isRCVerified: true,
        isBlocked: false
    }).select('firstName lastName phoneNumber wilaya commune r_commerce email isRCVerified isBlocked');
    if(!Users || Users.length <= 0){
        const err = new CustomError('No client found', 404);
        return next(err);
    }
    //for each user, get the wilaya and commune
    const response = await Promise.all(Users.map(async (user) => {
        const wilaya = await CitiesService.findCitiesFRByCodeC(user.wilaya, user.commune);
        return {
            ...user.toObject(),
            wilaya: wilaya.wilaya,
            commune: wilaya.baladiya
        }
    }));
    res.status(200).json(response);
});
//block specific client
const BlockClient = asyncErrorHandler(async (req, res, next) => {
    const { client } = req.body;
    if(!client || !mongoose.Types.ObjectId.isValid(client)){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    const existingClient = await User.findById(client);
    if(!existingClient){
        const err = new CustomError('Client not found', 404);
        return next(err);
    }
    existingClient.isBlocked = true;
    const updatedClient = await existingClient.save();
    if(!updatedClient){
        const err = new CustomError('Error while blocking client', 500);
        return next(err);
    }
    res.status(200).json({message: 'Client blocked successfully'});
});
//unblock specific client
const UnblockClient = asyncErrorHandler(async (req, res, next) => {
    const { client } = req.body;
    if(!client || !mongoose.Types.ObjectId.isValid(client)){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    const existingClient = await User.findById(client);
    if(!existingClient){
        const err = new CustomError('Client not found', 404);
        return next(err);
    }
    existingClient.isBlocked = false;
    const updatedClient = await existingClient.save();
    if(!updatedClient){
        const err = new CustomError('Error while unblocking client', 500);
        return next(err);
    }
    res.status(200).json({message: 'Client unblocked successfully'});
});
//verify specific client
const VerifyClient = asyncErrorHandler(async (req, res, next) => {
    const { client, RC } = req.body;
    if(!client || !mongoose.Types.ObjectId.isValid(client)){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    if(!RC || validator.isEmpty(RC)){
        const err = new CustomError('Commercial register number is required', 400);
        return next(err);
    }
    const existingClient = await User.findById(client);
    if(!existingClient){
        const err = new CustomError('Client not found', 404);
        return next(err);
    }

    existingClient.r_commerce = RC;
    existingClient.isRCVerified = true;
    existingClient.isBlocked = false;

    const updatedClient = await existingClient.save();
    if(!updatedClient){
        const err = new CustomError('Error while verifying client', 500);
        return next(err);
    }
    res.status(200).json({message: 'Client verified successfully'});
});
//fetch specific user by id
const GetClientByIdForStore = asyncErrorHandler(async (req, res, next) => {
    const { id, store } = req.params;
    if(!id || !mongoose.Types.ObjectId.isValid(id)){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }

    //check if store already exists
    const myStore = await MyStores.findOne({ 
        user: id,
        store: store,
    });

    if(!myStore){
        const err = new CustomError('Client not found in your list', 400);
        return next(err);
    }

    const user = await User.findById(id);
    if(!user){
        const err = new CustomError('User not found', 404);
        return next(err);
    }
    
    const wilaya = await CitiesService.findCitiesFRByCodeC(user.wilaya, user.commune);
    
    const response = {
        ...user.toObject(),
        wilaya: wilaya.wilaya,
        commune: wilaya.baladiya,
        isSeller: myStore.isSeller
    };
    
    res.status(200).json(response);
});
//update user profile
const UpdateUserProfile = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { firstName, lastName, phoneNumber, email, password, oldPassword } = req.body;

    // Validate ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return next(new CustomError('ID utilisateur invalide', 400));
    }

    // Get existing user first to ensure it exists
    const existingUser = await UserService.findUserById(id);
    if (!existingUser) {
        return next(new CustomError('Client introuvable', 404));
    }

    // Create updates object to track changes
    const updates = {};

    // Process name update
    if (firstName !== undefined || lastName !== undefined) {
        if ((!firstName || validator.isEmpty(firstName)) && 
            (!lastName || validator.isEmpty(lastName))) {
            return next(new CustomError('Nom et prénom sont requis', 400));
        }
        
        if (firstName && !validator.isEmpty(firstName)) {
            updates.firstName = firstName;
        }
        
        if (lastName && !validator.isEmpty(lastName)) {
            updates.lastName = lastName;
        }
    }

    // Process phone number update
    if (phoneNumber !== undefined) {
        if (!phoneNumber || validator.isEmpty(phoneNumber)) {
            return next(new CustomError('Numéro de téléphone est requis', 400));
        }
        
        if (!validator.isMobilePhone(phoneNumber, 'ar-DZ')) {
            return next(new CustomError('Numéro de téléphone non valide', 400));
        }
        
        // Only check for duplicate if number is different from current
        if (phoneNumber !== existingUser.phoneNumber) {
            const userByPhone = await UserService.findUserByPhone(phoneNumber);
            if (userByPhone) {
                return next(new CustomError('Numéro de téléphone déjà existant', 400));
            }
            updates.phoneNumber = phoneNumber;
        }
    }

    // Process email update
    if (email !== undefined) {
        if (!email || validator.isEmpty(email)) {
            return next(new CustomError('Email est requis', 400));
        }
        
        if (!validator.isEmail(email)) {
            return next(new CustomError('Email non valide', 400));
        }
        
        // Only check for duplicate if email is different from current
        if (email !== existingUser.email) {
            const userByEmail = await UserService.findUserByEmail(email);
            if (userByEmail) {
                return next(new CustomError('Email déjà existant', 400));
            }
            updates.email = email;
        }
    }

    // Process password update
    if (password !== undefined || oldPassword !== undefined) {
        if (!password || validator.isEmpty(password) || !oldPassword || validator.isEmpty(oldPassword)) {
            return next(new CustomError('Nouveau mot de passe et ancien mot de passe sont requis', 400));
        }
        
        // Validate password strength
        if (!validator.isStrongPassword(password)) {
            return next(new CustomError('Le mot de passe doit contenir au moins 8 caractères, une lettre majuscule, une lettre minuscule, un chiffre et un caractère spécial', 400));
        }
        
        // Verify old password
        const isPasswordValid = await bcrypt.comparePassword(oldPassword, existingUser.password);
        if (!isPasswordValid) {
            return next(new CustomError('L\'ancien mot de passe est incorrect', 400));
        }
        
        // Hash new password
        const hash = await bcrypt.hashPassword(password);
        updates.password = hash;
    }

    // Check if any updates were requested
    if (Object.keys(updates).length === 0) {
        return res.status(200).json({
        message: 'Aucune modification n\'a été effectuée',
        });
    }

    // Update user with all changes at once
    const updatedUser = await User.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
    );
    
    if (!updatedUser) {
        return next(new CustomError('Une erreur s\'est produite lors de la mise à jour de votre profil. Réessayez plus tard.', 400));
    }

    res.status(200).json({
        message: 'Profil mis à jour avec succès',
    });
});
//add new address 
const AddNewAddress = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { name, addr, location } = req.body;    
    // Check if all fields are provided
    if(!id || !mongoose.Types.ObjectId.isValid(id) ||
        !name || validator.isEmpty(name) ||
        !addr || validator.isEmpty(addr)
    ){
        const err = new CustomError('Tout les champs sont requis', 400);
        return next(err);
    }
    
    // Create new address object
    const newAddress = {
        name: name,
        address: addr,
        location: location || null
    };
    
    // Update user by pushing new address to storeAddresses array
    const updatedUser = await User.findByIdAndUpdate(
        id,
        { $push: { storeAddresses: newAddress } },
        { new: true, runValidators: true }
    );
    
    if (!updatedUser) {
        return next(new CustomError('Une erreur s\'est produite lors de l\'ajout de l\'adresse. Réessayez plus tard.', 400));
    }

    // Return the newly added address in the response
    const addedAddress = updatedUser.storeAddresses[updatedUser.storeAddresses.length - 1];

    res.status(200).json({
        message: 'Adresse ajoutée avec succès',
        address: addedAddress
    });
});
//update an address
const UpdateAddress = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { addressId, name, addr, location } = req.body;
    //check if all fields are provided
    if (!id || !mongoose.Types.ObjectId.isValid(id) || 
        !addressId || !mongoose.Types.ObjectId.isValid(addressId)) {
        return next(new CustomError('Identifiants invalides', 400));
    }
    
    // Check if at least one update field is provided
    if ((!name || validator.isEmpty(name)) && 
        (!addr || validator.isEmpty(addr)) && 
        (!location || validator.isEmpty(location))) {
        return next(new CustomError('Au moins un champ est requis pour la mise à jour', 400));
    }

    // Check if user exists
    const existingUser = await UserService.findUserById(id);
    if (!existingUser) {
        return next(new CustomError('Client introuvable', 404));
    }
    
    // Find address by ID and check if it exists
    const addressIndex = existingUser.storeAddresses.findIndex(
        address => address._id.toString() === addressId
    );
    
    if (addressIndex === -1) {
        return next(new CustomError('Adresse introuvable', 404));
    }
    
    // Update fields if provided
    const address = existingUser.storeAddresses[addressIndex];
    
    if (name && !validator.isEmpty(name)) address.name = name;
    if (addr && !validator.isEmpty(addr)) address.address = addr;
    if (location && !validator.isEmpty(location)) address.location = location;
    
    // Save the updated user document
    const updatedUser = await existingUser.save();

    if (!updatedUser) {
        return next(new CustomError('Une erreur s\'est produite lors de la mise à jour de l\'adresse. Réessayez plus tard.', 400));
    }

    res.status(200).json({
        message: 'Adresse mise à jour avec succès',
    });
});
// Delete an address
const DeleteAddress = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { addressId } = req.body;
    
    // Validate required IDs
    if (!id || !mongoose.Types.ObjectId.isValid(id) || 
        !addressId || !mongoose.Types.ObjectId.isValid(addressId)) {
        return next(new CustomError('Identifiants invalides', 400));
    }
    
    // Check if user exists
    const existingUser = await UserService.findUserById(id);
    if (!existingUser) {
        return next(new CustomError('Client introuvable', 404));
    }
    
    // Check if the address exists in the user's addresses
    const addressExists = existingUser.storeAddresses.some(
        address => address._id.toString() === addressId
    );
    
    if (!addressExists) {
        return next(new CustomError('Adresse introuvable', 404));
    }
    
    // Remove the address using MongoDB's $pull operator
    const updatedUser = await User.findByIdAndUpdate(
        id,
        { 
            $pull: { 
                storeAddresses: { _id: addressId } 
            } 
        },
        { new: true }
    );
    
    if (!updatedUser) {
        return next(new CustomError('Une erreur s\'est produite lors de la suppression de l\'adresse. Réessayez plus tard.', 400));
    }
    
    // Return success response
    res.status(200).json({
        message: 'Adresse supprimée avec succès'
    });
});

module.exports = {
    GetAllClientsVerified,
    GetAllClientsUnverified,
    GetAllClientsBlocked,
    GetClientByIdForStore,
    BlockClient,
    UnblockClient,
    VerifyClient,
    UpdateUserProfile,
    AddNewAddress,
    UpdateAddress,
    DeleteAddress
}