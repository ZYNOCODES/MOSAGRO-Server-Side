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

module.exports = {
    GetAllClientsVerified,
    GetAllClientsUnverified,
    GetAllClientsBlocked,
    GetClientByIdForStore,
    BlockClient,
    UnblockClient,
    VerifyClient,
    UpdateUserProfile
}