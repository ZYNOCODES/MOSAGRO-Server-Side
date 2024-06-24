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
    const {UserName, Password} = req.body;
    
    //check if UserName or Password is empty
    if(!UserName || !Password){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }

    //check if User exist
    let existUser, existStore, existAdmin;
    if(validator.isMobilePhone(UserName)){
        existUser = await UserService.findUserByPhone(UserName);
        existStore = await StoreService.findStoreByPhone(UserName);
        existAdmin = await AdminService.findAdminByPhone(UserName);
        if(!existUser && !existStore && !existAdmin){
            const err = new CustomError('Username or password incorrect', 400);
            return next(err);
        }
    }else if(validator.isEmail(UserName)){
        existUser = await UserService.findUserByEmail(UserName);
        existStore = await StoreService.findStoreByEmail(UserName);
        existAdmin = await AdminService.findAdminByEmail(UserName);
        if(!existUser && !existStore && !existAdmin){
            const err = new CustomError('Username or password incorrect', 400);
            return next(err);
        }
    }else{
        const err = new CustomError('Username or password incorrect', 400);
        return next(err);
    }

    let USER = null;
    if(existAdmin){
        USER = existAdmin;
        USER.type = "Admin";
    }else if(existStore){
        USER = existStore;
        USER.type = "Store";
    }else if(existUser){
        USER = existUser;
        USER.type = "User";
    }
    //check if password is correct
    const match = await bcrypt.comparePassword(Password, USER.password);
    if(!match){
        const err = new CustomError('Username or password incorrect', 400);
        return next(err);
    }
    //check if status is already active for user.type == "Store"
    if(USER.type == "Store"){
        if(USER.status == "En attente"){
            const err = new CustomError('Your account is not active yet. try again later', 400);
            return next(err);
        }else if(USER.status == "Suspended"){
            const err = new CustomError('Your account is suspended, probably your subscription is expired', 400);
            return next(err);
        }else if(USER.status == "Active"){
            const timezone = 'Africa/Algiers';
            const currentTime = moment.tz(timezone);
            //get subscription details
            const subscription = await SubscriptionStore.findById(
                USER.subscriptions[USER.subscriptions.length - 1]
            );
            if(!subscription){
                const err = new CustomError('Subscription not found', 404);
                return next(err);
            }
            //check if subscription has expired
            if(currentTime.isSameOrAfter(subscription.expiryDate)){
                //update Store status to suspended
                const updatedStore = await Store.updateOne({ _id: USER._id }, { status: 'Suspended' });
                if(!updatedStore){
                    const err = new CustomError('Somthing went wrong. Login again', 400);
                    return next(err);
                }
                const err = new CustomError('Subscription has expired', 400);
                return next(err);
            }
        }
    }

    //create token
    const token = createToken(USER._id, USER.type);

    //return User
    res.status(200).json({id: USER.id, token, type: USER.type});
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
    }

    //return User
    res.status(200).json({message: 'Profil created successfully'});
});

module.exports = {
    SignIn,
    SignUp
}