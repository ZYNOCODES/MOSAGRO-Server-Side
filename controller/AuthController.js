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
const validator = require('validator');
const MyStores = require('../model/MyStoresModel');
const EmailOTPVerification = require('../model/EmailOTPVerification.js');
const NodeMailer = require('../util/NodeMailer.js');
const SubscriptionStoreService = require('../service/SubscriptionStoreService.js');
const {
    createToken
} = require('../util/JWT.js');
const UtilMoment = require('../util/Moment.js');
const moment = require('moment');


//login Admin
const SignInAdmin = asyncErrorHandler(async (req, res, next) => {
    const { UserName, Password } = req.body;
    
    // Check if UserName or Password is empty
    if (!UserName || !Password) {
        return next(new CustomError('All fields are required', 400));
    }
    
    let user;
    // Check if User exists by phone or email
    if (validator.isMobilePhone(UserName)) {
        user = await AdminService.findAdminByPhone(UserName);
    } else if (validator.isEmail(UserName)) {
        user = await AdminService.findAdminByEmail(UserName);
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
    
    // Create token
    const token = createToken(user._id, process.env.ADMIN_TYPE);

    // Return user
    res.status(200).json({token});
});

//login Store
const SignInStore = asyncErrorHandler(async (req, res, next) => {
    const { UserName, Password } = req.body;
    
    // Check if UserName or Password is empty
    if (!UserName || !Password) {
        return next(new CustomError('All fields are required', 400));
    }

    let user;
    // Check if User exists by phone or email
    if (validator.isMobilePhone(UserName)) {
        user = await StoreService.findStoreByPhone(UserName);
    } else if (validator.isEmail(UserName)) {
        user = await StoreService.findStoreByEmail(UserName);
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
    if (['En attente', 'Suspended'].includes(user.status)) {
        const errorMessage = user.status == 'En attente'
            ? 'Your account is not active yet. Try again later.'
            : 'Your account is suspended, probably your subscription is expired';
        return next(new CustomError(errorMessage, 400));
    } else if (user.status == 'Active') {
        // Set to UTC time zone
        const currentTime = UtilMoment.getCurrentDateTime();
        // Get subscription details
        const existSubscription = await SubscriptionStoreService.findLastSubscriptionStoreByStore(user._id);
        if (!existSubscription) {
            const err = new CustomError('You do not have an active subscription', 400);
            return next(err);
        }
        // Check if subscription has expired
        if (currentTime.isSameOrAfter(moment(existSubscription.expiryDate))) {
            // Update Store status to suspended
            const updatedStore = await Store.updateOne({ _id: user._id }, { status: 'Suspended' });
            if (!updatedStore) {
                return next(new CustomError('Something went wrong. Login again', 400));
            }
            return next(new CustomError('Your subscription has expired', 400));
        }
    }
    
    // Create token
    const token = createToken(user._id, process.env.STORE_TYPE);

    // Return user
    res.status(200).json({token});
});

//login Client
const SignInClient = asyncErrorHandler(async (req, res, next) => {
    const { UserName, Password } = req.body;
    
    // Check if UserName or Password is empty
    if (!UserName || !Password) {
        return next(new CustomError('All fields are required', 400));
    }

    let user;
    // Check if User exists by phone or email
    if (validator.isMobilePhone(UserName)) {
        user = await UserService.findUserByPhone(UserName);
    } else if (validator.isEmail(UserName)) {
        user = await UserService.findUserByEmail(UserName);
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
    
    // Create token
    const token = createToken(user._id, process.env.CLIENT_TYPE);

    // Return user
    res.status(200).json({
        token,
        info: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber,
            email: user.email,
            wilaya: user.wilaya,
            commune: user.commune,
            r_commerce: user.r_commerce,
            storeAddresses: user.storeAddresses,
            isSeller: user.isSeller
        }
    });
});

//singup store by sending email otp verification
const SignUpStore = asyncErrorHandler(async (req, res, next) => {
    const { Email } = req.body;

    // Validation
    if (!Email || validator.isEmpty(Email)) {
        return next(new CustomError('All fields are required', 400));
    }
    if (!validator.isEmail(Email)) {
        return next(new CustomError('Email is not valid', 400));
    }

    // Start transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Check if the email already exists
        let storeByEmail = await StoreService.findStoreByEmail(Email);

        // If store doesn't exist, create it
        if (!storeByEmail) {
            const status = "En attente"; // Initialize status before using
            const newStore = await Store.create([{
                email: Email,
                status,
            }], { session });

            if (!newStore[0]) {
                throw new CustomError('Error while creating new store. Try again', 400);
            }

            storeByEmail = newStore[0]; // Assign newly created store to `storeByEmail`
        }

        //check if email is alredy verified
        if (storeByEmail.emailVerification === true) {
            return next(new CustomError('Email is already verified. Please log in.', 400));
        }

        // Generate OTP (4-digit random number)
        const otp = Math.floor(1000 + Math.random() * 9000);

        // Hash the OTP
        const hashOTP = await bcrypt.hashPassword(otp.toString());

        // Set to UTC time zone
        const currentTime = UtilMoment.getCurrentDateTime(); // Ensures UTC+0

        // Save OTP in the database with an expiry time of 1 hour
        const existingOTP = await EmailOTPVerification.findOne({ store: storeByEmail._id });
        
        if (!existingOTP) {
            // Create a new OTP entry if it doesn't exist
            const newOTP = await EmailOTPVerification.create([{
                store: storeByEmail._id, // Link OTP with the store ID
                otp: hashOTP,
                createdAt: currentTime.toDate(),
                expiresAt: currentTime.add(1, 'hour').toDate(),
            }], { session });

            if (!newOTP[0]) {
                throw new CustomError('Error while saving OTP in the database', 500);
            }
        } else {
            // Update existing OTP if found
            await EmailOTPVerification.updateOne(
                { store: storeByEmail._id },
                {
                    otp: hashOTP,
                    createdAt: currentTime.toDate(),
                    expiresAt: currentTime.add(1, 'hour').toDate(),
                },
                { session }
            );
        }

        // Email options for sending OTP
        const mailOptions = {
            from: process.env.AUTH_EMAIL,
            to: storeByEmail.email,
            subject: 'Email Verification',
            html: `
                <h2>Please verify your email</h2>
                <p>Your OTP is <strong>${otp}</strong></p>
                <a href="http://localhost:5173/VerifyCode/${storeByEmail._id}">Verify your email</a>
            `,
        };

        // Send the OTP email
        await NodeMailer.transporter.sendMail(mailOptions);

        // Optional: Verify transporter success (only logs error)
        NodeMailer.transporter.verify((error) => {
            if (error) {
                console.log(error);
                throw new CustomError('Error while sending OTP', 500);
            }
        });

        // Commit the transaction if everything is successful
        await session.commitTransaction();

        // Return success message
        res.status(200).json({
            message: 'OTP sent successfully. Please check your email for verification.',
            store: storeByEmail._id,
        });
    } catch (err) {
        // Abort the transaction in case of an error
        await session.abortTransaction();
        console.log(err);
        return next(new CustomError('Error while processing the request. Try again', 500));
    } finally {
        session.endSession(); // End session whether success or failure
    }
});
//update singup store
const SignUpUpdateStore = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { Password, FirstName, LastName, Category, Wilaya, Commune, R_Commerce, Address, storeName } = req.body;

    // Validate required fields
    if ([id, Password, FirstName, LastName, Address, Category, storeName, Wilaya, Commune, R_Commerce].some(field => !field || validator.isEmpty(field.toString()))) {
        return next(new CustomError('All fields are required', 400));
    }

    // Check if the store is already verified and has a password (indicating a signed-up account)
    const existingStore = await Store.findOne({ 
        _id: id, 
        emailVerification: true 
    });
    
    if (!existingStore) {
        return next(new CustomError('Store not found. Please check your details or sign up.', 404));
    }
    
    if (existingStore.password) {
        return next(new CustomError('Account already verified. Please log in.', 400));
    }

    // Check if the category exists
    const existCategory = await CategoryService.findCategoryById(Category);
    if (!existCategory) {
        return next(new CustomError('Category not found', 404));
    }

    // Check if the wilaya and commune exist
    const existWilaya = await CitiesService.findCitiesFRByCodeC(Wilaya, Commune);
    if (!existWilaya) {
        return next(new CustomError('The wilaya and its commune are incorrect', 404));
    }

    // Hash the password
    const hash = await bcrypt.hashPassword(Password);

    // Update the store data
    existingStore.password = hash;
    existingStore.firstName = FirstName;
    existingStore.lastName = LastName;
    existingStore.storeAddress = Address;
    existingStore.storeName = storeName;
    existingStore.storeLocation = null; // Reset location as null (if needed)
    existingStore.wilaya = Wilaya;
    existingStore.commune = Commune;
    existingStore.r_commerce = R_Commerce;
    existingStore.categories = [existCategory._id];

    // Save the updated store
    const updatedStore = await existingStore.save();
    if (!updatedStore) {
        return next(new CustomError('Error while updating store. Please try again', 500));
    }

    // Return success response
    res.status(200).json({ message: 'Store updated successfully' });
});
//verifie email otp for store
const VerifyStoreOTP = asyncErrorHandler(async (req, res, next) => {
    const { store, otp } = req.body;
    // Validation
    if (!otp || !store || !mongoose.Types.ObjectId.isValid(store)) {
        return next(new CustomError('Store ID and OTP are required', 400));
    }

    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Find the OTP linked to the store
        const otpRecord = await EmailOTPVerification.findOne({ store: store });

        // Check if OTP record exists
        if (!otpRecord) {
            return next(new CustomError('OTP not found', 400));
        }

        // Check if OTP has expired
        const currentTime = UtilMoment.getCurrentDateTime();
        if (currentTime.isAfter(otpRecord.expiresAt)) {
            return next(new CustomError('OTP has expired', 400));
        }

        // Compare provided OTP with stored OTP (hashed)
        const isMatch = await bcrypt.comparePassword(otp.toString(), otpRecord.otp);
        if (!isMatch) {
            return next(new CustomError('Invalid OTP', 400));
        }

        // OTP is valid - Update the store status and delete the OTP in a transaction
        const storeUpdate = await Store.findByIdAndUpdate(
            store,
            { emailVerification: true },
            { session }
        );

        if (!storeUpdate) {
            throw new CustomError('Error while updating store email verification', 500);
        }

        // Delete the OTP record
        const otpDeletion = await EmailOTPVerification.deleteOne({ store: store }).session(session);
        
        if (!otpDeletion.deletedCount) {
            throw new CustomError('Error while deleting OTP record', 500);
        }

        // Commit the transaction if both operations succeed
        await session.commitTransaction();
        session.endSession();

        // Return success message
        res.status(200).json({
            message: 'OTP verified successfully. Store email is now verified.',
        });
    } catch (err) {
        // Abort the transaction in case of any error
        await session.abortTransaction();
        session.endSession();
        console.log(err);
        return next(new CustomError('Error during OTP verification. Try again', 500));
    }
});

//singup store
const SignUpClient = asyncErrorHandler(async (req, res, next) => {
    const {Email, Password, FirstName, LastName, PhoneNumber, Category,
        Wilaya, Commune, R_Commerce, Address} = req.body;
    //check if all required fields are provide
    if([Password, FirstName, LastName, PhoneNumber, Address, Wilaya, Commune, R_Commerce].some(field => !field)) {
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    
    const UserByPhone = UserService.findUserByPhone(PhoneNumber);
    if(UserByPhone){
        const err = new CustomError('Phone number already exist', 400);
        return next(err);
    }

    //check if email already exist
    if (Email) {
        if (!validator.isEmail(Email)) {
            const err = new CustomError('Email is not valid', 400);
            return next(err);
        }

        const UserByEmail = await UserService.findUserByEmail(Email);

        if (UserByEmail) {
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

    const newUser = await User.create({
        password: hash,
        phoneNumber: PhoneNumber, phoneVerification: false,
        email: Email, emailVerification: false,
        firstName: FirstName, 
        lastName: LastName, 
        storeAddresses: [{
            name: 'default address',
            address: Address,
            location: null
        }], 
        wilaya: Wilaya, commune: Commune, 
        r_commerce: R_Commerce
    });
    if(!newUser){
        const err = new CustomError('Error while creating new user. try again', 400);
        return next(err);
    }
    //send phone otp

    //return store
    // res.status(200).json({message: 'Store created successfully'});
});

//create new client from a store
const CreateNewClientForAStore = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    const {
        Email, Password, FirstName, LastName, PhoneNumber, Address, 
        Wilaya, Commune, RC
    } = req.body;
    // Check if all required fields are provided
    if ([store, Password, FirstName, LastName, PhoneNumber, Address, 
        Wilaya, Commune, RC].some(field => !field || validator.isEmpty(field))) {
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
            storeAddresses: [{
                name: 'default address',
                address: Address,
                location: null
            }],
            wilaya: existWilaya.codeW,
            commune: existWilaya.codeC,
            r_commerce: RC.toString()
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
//create new seller from a store
const CreateNewSellerForAStore = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    const {
        Email, Password, FirstName, LastName, PhoneNumber, Address, 
        Wilaya, Commune, RC
    } = req.body;
    // Check if all required fields are provided
    if ([store, Password, FirstName, LastName, PhoneNumber, Address, 
        Wilaya, Commune, RC].some(field => !field || validator.isEmpty(field))) {
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
            wilaya: existWilaya.codeW,
            commune: existWilaya.codeC,
            r_commerce: RC.toString()
        }], { session });
        //check if the user created successfully
        if (!newUser) {
            return next(new CustomError('Error while creating the seller, try again', 400));
        }
        // Create the MyStore entry
        await MyStores.create([{
            user: newUser[0]._id,
            store: existStore._id,
            status: 'approved',
            isSeller: true
        }], { session });

        // Commit the transaction if everything is successful
        await session.commitTransaction();

        // Return a detailed success message
        res.status(200).json({ message: `Seller profile created successfully.`,});

    } catch (error) {
        // Abort the transaction in case of any errors
        await session.abortTransaction();
        next(new CustomError('An error occurred while creating the seller profile, try again', 500));
    } finally {
        // End the session
        session.endSession();
    }
});





module.exports = {
    SignInAdmin,
    SignInStore,
    SignInClient,
    SignUpStore,
    VerifyStoreOTP,
    SignUpUpdateStore,
    SignUpClient,
    CreateNewClientForAStore,
    CreateNewSellerForAStore
}