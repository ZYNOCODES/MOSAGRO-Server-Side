const Admin = require('../model/AdminModel.js');
const User = require('../model/UserModel.js');
const Store = require('../model/StoreModel.js');
const UserService = require('../service/UserService.js');
const StoreService = require('../service/StoreService.js'); 
const AdminService = require('../service/AdminService.js');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const bcrypt = require('../util/bcrypt.js');
const Codification = require('../util/Codification.js');
const validator = require('validator');
const SubscriptionStore = require('../model/SubscriptionStoreModel');
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
    const {Email, Password, FirstName, LastName, PhoneNumber, 
        Wilaya, Commune, R_Commerce, Address, storeName, storeLocation, 
        AuthType} = req.body;

    //check if all required fields are provided for Admin type
    const requiredFields = {
        Admin: [Password, FirstName, LastName, PhoneNumber],
        Store: [Password, FirstName, LastName, PhoneNumber, Address, storeName, storeLocation, Wilaya, Commune, R_Commerce],
        User: [Password, FirstName, LastName, PhoneNumber, Address, Wilaya, Commune, R_Commerce]
    };
    if (requiredFields[AuthType].some(field => !field)) {
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    
    //check if phone already exist
    const [admin, store, user] = await Promise.all([
        AdminService.findAdminByPhone(PhoneNumber),
        StoreService.findStoreByPhone(PhoneNumber),
        UserService.findUserByPhone(PhoneNumber)
    ]);
    if(admin || store || user){
        const err = new CustomError('Phone number already exist', 400);
        return next(err);
    }

    //check if email already exist
    if (Email) {
        if (!validator.isEmail(Email)) {
            const err = new CustomError('Email is not valid', 400);
            return next(err);
        }

        const [adminByEmail, storeByEmail, userByEmail] = await Promise.all([
            AdminService.findAdminByEmail(Email),
            StoreService.findStoreByEmail(Email),
            UserService.findUserByEmail(Email)
        ]);

        if (adminByEmail || storeByEmail || userByEmail) {
            const err = new CustomError('Email already exist', 400);
            return next(err);
        }
    }
    
    //hash password
    const hash = await bcrypt.hashPassword(Password);

    //create new User
    if(AuthType === "Admin"){
        const newAdmin = await Admin.create({
            email: Email, password: hash, firstName: FirstName, lastName: LastName, phoneNumber: PhoneNumber,        
        });
        if(!newAdmin){
            const err = new CustomError('Error while creating new admin', 400);
            return next(err);
        }
    }else if(AuthType === "Store"){
        const status = "En attente";
        //generate codification for a user
        const postalCode = "26";
        const type = "S";
        const code = await Codification.StoreCode(postalCode, type);
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
            status: status
        });
        if(!newStore){
            const err = new CustomError('Error while creating new store', 400);
            return next(err);
        }
    }else if(AuthType === "User"){
        //generate codification for a user
        const postalCode = "26";
        const type = "C";
        var code = await Codification.UserCode(postalCode, type);
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

module.exports = {
    SignIn,
    SignUp
}