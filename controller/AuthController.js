const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Admin = require('../model/AdminModel.js');
const User = require('../model/UserModel.js');
const Store = require('../model/StoreModel.js');
const UserService = require('../service/UserService.js');
const StoreService = require('../service/StoreService.js'); 
const AdminService = require('../service/AdminService.js');
const CitiesService = require('../service/CitiesService.js');
const CategoryService = require('../service/CategoryService.js');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const bcrypt = require('../util/bcrypt.js');
const Codification = require('../util/Codification.js');
const validator = require('validator');
const SubscriptionStore = require('../model/SubscriptionStoreModel');
const MyStores = require('../model/MyStoresModel');
const {
    createToken
} = require('../util/JWT.js');
const moment = require('moment');
require('moment-timezone');

//login
const SignIn = asyncErrorHandler(async (req, res, next) => {
    const { UserName, Password, Type } = req.body;
    
    // Check if UserName or Password is empty
    if (!UserName || !Password) {
        return next(new CustomError('All fields are required', 400));
    }

    // Check if Type is provided correctly
    if (!Type || validator.isEmpty(Type) ||
        !['ADMIN_API', 'STORE_API', 'CLIENT_API'].includes(Type)) {
        return next(new CustomError('Authentication rejected.', 400));
    }

    // Define user and functions to find users by phone or email
    let user = null;

    const findByPhone = async (phone) => {
        switch (Type) {
            case 'ADMIN_API':
                return await AdminService.findAdminByPhone(phone);
            case 'STORE_API':
                return await StoreService.findStoreByPhone(phone);
            case 'CLIENT_API':
                return await UserService.findUserByPhone(phone);
            default:
                return null;
        }
    };

    const findByEmail = async (email) => {
        switch (Type) {
            case 'ADMIN_API':
                return await AdminService.findAdminByEmail(email);
            case 'STORE_API':
                return await StoreService.findStoreByEmail(email);
            case 'CLIENT_API':
                return await UserService.findUserByEmail(email);
            default:
                return null;
        }
    };

    // Check if User exists by phone or email
    if (validator.isMobilePhone(UserName)) {
        user = await findByPhone(UserName);
    } else if (validator.isEmail(UserName)) {
        user = await findByEmail(UserName);
    } else {
        return next(new CustomError('Username or password incorrect', 400));
    }

    if (!user) {
        return next(new CustomError('Username or password incorrect', 400));
    }
    
    // Check if password is correct
    const match = await bcrypt.comparePassword(Password, user.password);
    if(!match){
        const err = new CustomError('Username or password incorrect', 400);
        return next(err);
    }

    // Check if status is already active for store api
    if (Type === 'STORE_API') {
        if (['En attente', 'Suspended'].includes(user.status)) {
            const errorMessage = user.status === 'En attente'
                ? 'Your account is not active yet. Try again later.'
                : 'Your account is suspended, probably your subscription is expired';
            return next(new CustomError(errorMessage, 400));
        } else if (user.status === 'Active') {
            const timezone = 'Africa/Algiers';
            const currentTime = moment.tz(timezone);
            // Get subscription details
            const subscription = await SubscriptionStore.findById(user.subscriptions[user.subscriptions.length - 1]);
            if (!subscription) {
                return next(new CustomError('Subscription not found', 404));
            }
            // Check if subscription has expired
            if (currentTime.isSameOrAfter(subscription.expiryDate)) {
                // Update Store status to suspended
                const updatedStore = await Store.updateOne({ _id: user._id }, { status: 'Suspended' });
                if (!updatedStore) {
                    return next(new CustomError('Something went wrong. Login again', 400));
                }
                return next(new CustomError('Subscription has expired', 400));
            }
        }
    }
    
    // Create token
    const token = createToken(user._id, Type);

    // Return user
    res.status(200).json({token});
});

//SignUp
const SignUp = asyncErrorHandler(async (req, res, next) => {
    const {Email, Password, FirstName, LastName, PhoneNumber, Category,
        Wilaya, Commune, R_Commerce, Address, storeName, storeLocation, 
        AuthType} = req.body;

    //check if all required fields are provided for Admin type
    const requiredFields = {
        Store: [Password, FirstName, LastName, PhoneNumber, Address, Category, storeName, storeLocation, Wilaya, Commune, R_Commerce],
        User: [Password, FirstName, LastName, PhoneNumber, Address, Wilaya, Commune, R_Commerce]
    };
    if (requiredFields[AuthType].some(field => !field)) {
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    
    //check if phone already exist
    const [store, user] = await Promise.all([
        StoreService.findStoreByPhone(PhoneNumber),
        UserService.findUserByPhone(PhoneNumber)
    ]);
    if(store || user){
        const err = new CustomError('Phone number already exist', 400);
        return next(err);
    }

    //check if email already exist
    if (Email) {
        if (!validator.isEmail(Email)) {
            const err = new CustomError('Email is not valid', 400);
            return next(err);
        }

        const [storeByEmail, userByEmail] = await Promise.all([
            StoreService.findStoreByEmail(Email),
            UserService.findUserByEmail(Email)
        ]);

        if (storeByEmail || userByEmail) {
            const err = new CustomError('Email already exist', 400);
            return next(err);
        }
    }

    //check if Category exist
    const existCategory = await CategoryService.findCategoryById(Category);
    if(!existCategory){
        const err = new CustomError('Category not found', 404);
        return next(err);
    }

    //check if the wilaya and commun exist
    const existWilaya = await CitiesService.findCitiesFRByCodeC(Wilaya, Commune);
    if(!existWilaya){
        const err = new CustomError('the wilaya and its commune is incorrect', 404);
        return next(err);
    }
    
    //hash password
    const hash = await bcrypt.hashPassword(Password);

    //create new User
    if(AuthType === "Store"){
        const status = "En attente";
        //generate codification for a user
        const code = await Codification.StoreCode(existWilaya.codeC, "S");
        //check if the user already exist with that code
        if(code == null){
            const err = new CustomError('Code already existe. repeat the proccess', 404);
            return next(err);
        }
        const newStore = await Store.create({
            email: Email, password: hash,
            firstName: FirstName, lastName: LastName, phoneNumber: PhoneNumber,
            storeAddress: Address, storeName: storeName, storeLocation: storeLocation, 
            code: code, wilaya: Wilaya, commune: Commune, r_commerce: R_Commerce,
            status: status,
            categories: [existCategory._id]
        });
        if(!newStore){
            const err = new CustomError('Error while creating new store', 400);
            return next(err);
        }
    }else if(AuthType === "User"){
        //generate codification for a user
        var code = await Codification.UserCode(existWilaya.codeC, "C");
        //check if the user already exist with that code
        if(code == null){
            const err = new CustomError('Code already existe. repeat the proccess', 404);
            return next(err);
        }
        const newUser = await User.create({
            email: Email, password: hash,
            firstName: FirstName, lastName: LastName, phoneNumber: PhoneNumber,
            storeAddresses: [Address], code: code, wilaya: Wilaya, commune: Commune, 
            r_commerce: R_Commerce
        });
        if(!newUser){
            const err = new CustomError('Error while creating new user', 400);
            return next(err);
        }
    }else{
        const err = new CustomError('Auth type not found', 400);
        return next(err);
    }

    //return User
    res.status(200).json({message: 'Profil created successfully'});
});

//create new client from a store
const CreateNewClientForAStore = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    const {
        Email, Password, FirstName, LastName, PhoneNumber, Address, 
        Wilaya, Commune
    } = req.body;
    // Check if all required fields are provided
    if ([store, Password, FirstName, LastName, PhoneNumber, Address, 
        Wilaya, Commune].some(field => !field || validator.isEmpty(field))) {
        return next(new CustomError('All fields are required', 400));
    }

    // Check if the store exists
    const existStore = await StoreService.findStoreById(store);
    if (!existStore) {
        return next(new CustomError('Store not found', 404));
    }

    // Check if the phone number already exists
    const existingUserByPhone = await UserService.findUserByPhone(PhoneNumber);
    if (existingUserByPhone) {
        return next(new CustomError('Phone number already exists', 400));
    }

    // Validate and check if the email already exists
    if (Email) {
        if (!validator.isEmail(Email)) {
            return next(new CustomError('Invalid email address', 400));
        }

        const existingUserByEmail = await UserService.findUserByEmail(Email);
        if (existingUserByEmail) {
            return next(new CustomError('Email already exists', 400));
        }
    }

    // Check if the Wilaya and Commune exist
    const existWilaya = await CitiesService.findCitiesFRByCodeC(Wilaya, Commune);
    if (!existWilaya) {
        return next(new CustomError('Invalid Wilaya or Commune', 404));
    }

    // Hash the password
    const hash = await bcrypt.hashPassword(Password);

    // Generate codification for the user
    const code = await Codification.UserCode(existWilaya.codeC, "C");
    if (code == null) {
        return next(new CustomError('Code generation failed, please retry again', 400));
    }

    // Start a session for the transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {

        // Create the new user
        const newUser = await User.create([{
            email: Email,
            password: hash,
            firstName: FirstName,
            lastName: LastName,
            phoneNumber: PhoneNumber,
            storeAddresses: [Address],
            code: code,
            wilaya: existWilaya.codeW,
            commune: existWilaya.codeC
        }], { session });
        //check if the user created successfully
        if (!newUser) {
            return next(new CustomError('Error while creating the user', 500));
        }
        // Create the MyStore entry
        await MyStores.create([{
            user: newUser[0]._id,
            store: existStore._id,
            status: 'approved',
        }], { session });

        // Commit the transaction if everything is successful
        await session.commitTransaction();

        // Return a detailed success message
        res.status(200).json({ message: `Client profile created successfully.`,});

    } catch (error) {
        // Abort the transaction in case of any errors
        await session.abortTransaction();
        next(new CustomError('An error occurred while creating the client profile', 500));
    } finally {
        // End the session
        session.endSession();
    }
});

module.exports = {
    SignIn,
    SignUp,
    CreateNewClientForAStore
}