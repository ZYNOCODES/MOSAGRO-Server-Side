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
const {
    createToken
} = require('../util/JWT.js');

//login
const SignIn = asyncErrorHandler(async (req, res, next) => {
    const {UserName, Password} = req.body;
    console.log(UserName);
    //check if UserName or Password is empty
    if(!UserName || !Password){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }

    //check if User exist
    const User = await UserService.findUserByName(UserName);
    const Store = await StoreService.findStoreByName(UserName);
    const Admin = await AdminService.findAdminByName(UserName);
    if(!User && !Store && !Admin){
        const err = new CustomError('Username or password incorrect', 400);
        return next(err);
    }
    let USER = null;
    if(Admin){
        USER = Admin;
        USER.type = "Admin";
    }else if(Store){
        USER = Store;
        USER.type = "Store";
    }else if(User){
        USER = User;
        USER.type = "User";
    }
    //check if password is correct
    const match = await bcrypt.comparePassword(Password, USER.password);
    if(!match){
        const err = new CustomError('Username or password incorrect', 400);
        return next(err);
    }

    //create token
    const token = createToken(USER.id);

    //return User
    res.status(200).json({id: USER.id, token, type: USER.type});
});

//SignUp
const SignUp = asyncErrorHandler(async (req, res, next) => {
    const {UserName, Password, Email, FirstName, LastName, PhoneNumber, 
        Address, storeName, storeLocation, AuthType} = req.body;

    //check if all required fields are provided for Admin type
    if(AuthType == "Admin") 
        if( !UserName || !Password || !FirstName || !LastName || !PhoneNumber){
            const err = new CustomError('All fields are required for admin', 400);
            return next(err);
        }
    //check if all required fields are provided for Store type
    if(AuthType == "Store")
        if( !UserName || !Password || !Email || !FirstName || !LastName || !PhoneNumber
            || !Address || !storeName || !storeLocation
        ){
            const err = new CustomError('All fields are required for store', 400);
            return next(err);
        }
    //check if all required fields are provided for User type
    if(AuthType == "User") 
        if( !UserName || !Password || !Email || !FirstName || !LastName || !PhoneNumber
            || !Address
        ){
            const err = new CustomError('All fields are required for user', 400);
            return next(err);
        }
    //check if User already exist
    if(AuthType === "Admin"){
        const Admin = await AdminService.findAdminByName(UserName);
        if(Admin){
            const err = new CustomError('Username already exist', 400);
            return next(err);
        }
    }else if(AuthType === "Store"){
        const Store = await StoreService.findStoreByName(UserName);
        if(Store){
            const err = new CustomError('Username already exist', 400);
            return next(err);
        }
    }else if(AuthType === "User"){
        const User = await UserService.findUserByName(UserName);
        if(User){
            const err = new CustomError('Username already exist', 400);
            return next(err);
        }
    }
    
    //hash password
    const hash = await bcrypt.hashPassword(Password);

    //create new User
    if(AuthType === "Admin"){
        const newAdmin = await Admin.create({
            username: UserName, password: hash, firstName: FirstName, lastName: LastName, phoneNumber: PhoneNumber,        
        });
        if(!newAdmin){
            const err = new CustomError('Error while creating new admin', 400);
            return next(err);
        }
    }else if(AuthType === "Store"){
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
            username: UserName, password: hash, email: Email, firstName: FirstName, lastName: LastName, phoneNumber: PhoneNumber,
            storeAddress: Address, storeName: storeName, storeLocation: storeLocation, code: code
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
            username: UserName, password: hash, email: Email, firstName: FirstName, lastName: LastName, phoneNumber: PhoneNumber,
            storeAddress: Address, code: code
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