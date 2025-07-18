const mongoose = require('mongoose');
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
const NotificationService = require('../service/NotificationService.js');
const PasswordResetOTP = require('../model/PasswordResetOTP.js');
const SubscriptionStore = require('../model/SubscriptionStoreModel.js');
const SubscriptionService = require('../service/SubscriptionService.js');
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
        return next(new CustomError('Tous les champs sont obligatoires', 400));
    }
    
    let user;
    // Check if User exists by phone or email
    if (validator.isMobilePhone(UserName)) {
        user = await AdminService.findAdminByPhone(UserName);
    } else if (validator.isEmail(UserName)) {
        user = await AdminService.findAdminByEmail(UserName);
    } else {
        return next(new CustomError('Nom d\'utilisateur ou mot de passe incorrect', 400));
    }

    if (!user) {
        return next(new CustomError('Nom d\'utilisateur ou mot de passe incorrect', 400));
    }
    
    // Check if password is correct
    const match = await bcrypt.comparePassword(Password, user.password);
    if(!match){
        const err = new CustomError('Nom d\'utilisateur ou mot de passe incorrect', 400);
        return next(err);
    }
    
    // Create token
    const token = createToken(user._id, process.env.ADMIN_TYPE);

    // Return user
    res.status(200).json({
        token,
        infos: {
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber,
        }
    });
});

//login Store
const SignInStore = asyncErrorHandler(async (req, res, next) => {
    const { UserName, Password } = req.body;
    
    // Check if UserName or Password is empty
    if (!UserName || !Password) {
        return next(new CustomError('Tous les champs sont obligatoires', 400));
    }

    let user;
    // Check if User exists by phone or email
    if (validator.isMobilePhone(UserName)) {
        user = await StoreService.findStoreByPhone(UserName);
    } else if (validator.isEmail(UserName)) {
        user = await StoreService.findStoreByEmail(UserName);
    } else {
        return next(new CustomError('Nom d\'utilisateur ou mot de passe incorrect', 400));
    }

    if (!user) {
        return next(new CustomError('Nom d\'utilisateur ou mot de passe incorrect', 400));
    }
    
    // Validate password
    const isPasswordValid = await bcrypt.comparePassword(Password, user.password);
    if (!isPasswordValid) {
        return next(new CustomError('Nom d\'utilisateur ou mot de passe incorrect', 400));
    }

    // Handle user status
    if (['En attente', 'Suspended'].includes(user.status)) {
        const errorMessage = user.status === 'En attente'
            ? 'Votre compte n\'est pas encore actif. Réessayez plus tard.'
            : 'Votre compte est suspendu, votre abonnement est probablement expiré';
        return next(new CustomError(errorMessage, 400));
    }

    // Check subscription for active users
    if (user.status === 'Active') {
        const currentTime = UtilMoment.getCurrentDateTime();
        const lastSubscription = await SubscriptionStoreService.findLastSubscriptionStoreByStore(user._id);

        // Validate subscription existence
        if (!lastSubscription) {
            await Store.updateOne({ _id: user._id }, { status: 'Suspended' });
            return next(new CustomError('Vous n\'avez pas un abonnement actif', 400));
        }

        // Validate subscription expiry
        if (currentTime.isSameOrAfter(moment(lastSubscription.expiryDate))) {
            await Store.updateOne({ _id: user._id }, { status: 'Suspended' });
            return next(new CustomError('Votre abonnement a expiré', 400));
        }
    }
    
    // Create token
    const token = createToken(user._id, process.env.STORE_TYPE);

    // Return user
    res.status(200).json({
        token,
        infos: {
            storeName: user.storeName,
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber,
        }
    });
});

//login Client
const SignInClient = asyncErrorHandler(async (req, res, next) => {
    const { UserName, Password } = req.body;
    
    // Check if UserName or Password is empty
    if (!UserName || !Password) {
        return next(new CustomError('Tous les champs sont obligatoires', 400));
    }

    let user;
    // Check if User exists by phone or email
    if (validator.isMobilePhone(UserName)) {
        user = await UserService.findUserByPhone(UserName);
    } else if (validator.isEmail(UserName)) {
        user = await UserService.findUserByEmail(UserName);
    } else {
        return next(new CustomError('Nom d\'utilisateur ou mot de passe incorrect', 400));
    }

    if (!user) {
        return next(new CustomError('Nom d\'utilisateur ou mot de passe incorrect', 400));
    }
    
    // Check if password is correct
    const match = await bcrypt.comparePassword(Password, user.password);
    if(!match){
        const err = new CustomError('Nom d\'utilisateur ou mot de passe incorrect', 400);
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
    const { phone } = req.body;

    // Validation
    if (!phone || validator.isEmpty(phone)) {
        return next(new CustomError('Vous devez fournir votre numéro de téléphone', 400));
    }
    //check if phone number is valid algerian phone number
    if (!validator.isMobilePhone(phone, 'ar-DZ')) {
        return next(new CustomError('Numéro de téléphone non valide', 400));
    }

    // Start transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Check if the email already exists
        let storeByPhone = await StoreService.findStoreByPhone(phone);

        // If store doesn't exist, create it
        if (!storeByPhone) {
            const status = "En attente"; // Initialize status before using
            const newStore = await Store.create([{
                phoneNumber: phone,
                status,
            }], { session });

            if (!newStore[0]) {
                throw new CustomError('Erreur lors de la création du magasin. Veuillez réessayer', 500);
            }

            storeByPhone = newStore[0]; // Assign newly created store to `storeByPhone`
        }

        //check if email is alredy verified
        if (storeByPhone.phoneVerification === true) {
            return next(new CustomError('Numéro de téléphone déjà vérifié, essayez de vous connecter', 400));
        }

        // Generate OTP (4-digit random number)
        const otp = Math.floor(1000 + Math.random() * 9000);

        // Hash the OTP
        const hashOTP = await bcrypt.hashPassword(otp.toString());

        // Set to UTC time zone
        const currentTime = UtilMoment.getCurrentDateTime(); // Ensures UTC+0

        // Save OTP in the database with an expiry time of 1 hour
        const existingOTP = await EmailOTPVerification.findOne({ store: storeByPhone._id });
        
        if (!existingOTP) {
            // Create a new OTP entry if it doesn't exist
            const newOTP = await EmailOTPVerification.create([{
                store: storeByPhone._id, // Link OTP with the store ID
                otp: hashOTP,
                createdAt: currentTime.toDate(),
                expiresAt: currentTime.add(1, 'hour').toDate(),
            }], { session });

            if (!newOTP[0]) {
                throw new CustomError('Erreur lors de la création d\'un OPT. Veuillez réessayer.', 500);
            }
        } else {
            // Update existing OTP if found
            await EmailOTPVerification.updateOne(
                { store: storeByPhone._id },
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
            to: storeByPhone.email,
            subject: 'Email Verification',
            html: `
                <h2>Please verify your email</h2>
                <p>Your OTP is <strong>${otp}</strong></p>
                <a href="http://localhost:5173/VerifyCode/${storeByPhone._id}">Verify your email</a>
            `,
        };

        // Send the OTP email
        await NodeMailer.transporter.sendMail(mailOptions);

        // Optional: Verify transporter success (only logs error)
        NodeMailer.transporter.verify((error) => {
            if (error) {
                console.log(error);
                throw new CustomError('Erreur lors de l\'envoi de l\'OTP. Veuillez réessayer.', 500);
            }
        });

        // Commit the transaction if everything is successful
        await session.commitTransaction();

        // Return success message
        res.status(200).json({
            message: 'OTP sent successfully. Please check your email for verification.',
            store: storeByPhone._id,
        });
    } catch (err) {
        await session.abortTransaction();
        console.log(err);
        return next(new CustomError('Erreur lors du traitement de la demande. Veuillez réessayer.', 400));
    } finally {
        session.endSession();
    }
});
const SignUpStoreV2 = asyncErrorHandler(async (req, res, next) => {
    const { phone } = req.body;

    // Validation
    if (!phone || validator.isEmpty(phone)) {
        return next(new CustomError('Vous devez fournir votre numéro de téléphone', 400));
    }
    //check if phone number is valid algerian phone number
    if (!validator.isMobilePhone(phone, 'ar-DZ')) {
        return next(new CustomError('Numéro de téléphone non valide', 400));
    }

    // Check if the phone number already exists
    const storeByPhone = await StoreService.findStoreByPhone(phone);
    if (storeByPhone) {
        return next(new CustomError('Numéro de téléphone déjà existant', 400));
    }

    // Create a new store
    const newStore = await Store.create({
        phoneNumber: phone,
        status: "En attente",
    });

    if (!newStore) {
        return next(new CustomError('Erreur lors de la création du magasin. Veuillez réessayer', 500));
    }

    // Return success message
    res.status(200).json({ message: 'Votre magasin a été créé avec succès.', store: newStore._id });
});
//update singup store
const SignUpUpdateStore = asyncErrorHandler(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const { id } = req.params;
        const { Password, FirstName, LastName, Category, Wilaya, Commune, R_Commerce, Address, storeName } = req.body;

        // Validate required fields
        if ([id, Password, FirstName, LastName, Address, storeName, Wilaya, Commune, R_Commerce].some(field => !field || validator.isEmpty(field.toString()))) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Tous les champs sont obligatoires', 400));
        }

        // Check if Categories is an array and not empty
        if (!Array.isArray(Category) || Category.length === 0) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Au moins une catégorie doit être sélectionnée', 400));
        }

        // Check if password is strong
        // if (!validator.isStrongPassword(Password)) {
        //     await session.abortTransaction();
        //     session.endSession();
        //     return next(new CustomError('Le mot de passe doit contenir au moins 8 caractères, une lettre majuscule, une lettre minuscule, un chiffre et un caractère spécial', 400));
        // }

        // Check if the store exists
        const existingStore = await Store.findOne({ 
            _id: id
        });
        
        if (!existingStore) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Magasin introuvable. Veuillez vérifier vos informations ou vous réinscrire.', 404));
        }
        
        if (existingStore.password) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Votre compte est déjà créé. Veuillez vous connecter.', 400));
        }

        // Check if all categories exist
        const categoriesExist = await Promise.all(
            Category.map(category => CategoryService.findCategoryById(category))
        );
        
        if (categoriesExist.some(cat => !cat)) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Une ou plusieurs catégories sont introuvables vérifiez la liste des catégories', 404));
        }

        // Check if the wilaya and commune exist
        const existWilaya = await CitiesService.findCitiesFRByCodeC(Wilaya, Commune, session);
        if (!existWilaya) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Wilaya ou commune introuvable', 404));
        }

        // Hash the password
        const hash = await bcrypt.hashPassword(Password);

        // Update the store data
        existingStore.password = hash;
        existingStore.firstName = FirstName;
        existingStore.lastName = LastName;
        existingStore.storeAddress = Address;
        existingStore.storeName = storeName;
        existingStore.storeLocation = null;
        existingStore.wilaya = Wilaya;
        existingStore.commune = Commune;
        existingStore.r_commerce = R_Commerce;
        existingStore.categories = Category;
        existingStore.status = "Active"

        // Save the updated store
        const updatedStore = await existingStore.save({ session });
        if (!updatedStore) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Erreur lors de la mise à jour du magasin', 500));
        }

        //create a new subscription for this store for one month
        const existingBasicSubscription = await SubscriptionService.findBasicSubscription();
        if(!existingBasicSubscription){
            await session.abortTransaction();
            session.endSession();
            const err = new CustomError('Abonnement non trouvé', 404);
            return next(err);
        }
        const currentTime = UtilMoment.getCurrentDateTime();
        const ExpiryDate = currentTime.clone().add(1, 'months');
        const newSubscription = await SubscriptionStore.create([{
            store: existingStore._id,
            subscription: existingBasicSubscription._id,
            amount: Number(existingBasicSubscription.amount) * 1,
            validation: true,
            startDate: currentTime,
            expiryDate: ExpiryDate,
        }], { session });

        if (!newSubscription || !newSubscription[0]) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Erreur lors de la création de l\'abonnement', 500));
        }

        // Send notification to admin
        const msg = "Un nouveau magasin a été créé. Veuillez vérifier les détails et approuver ou rejeter la demande d'accès.";
        const newNotification = await NotificationService.createNewNotificationForAdmin(
            null,
            'new_store_creation',
            msg,
            session
        );

        if (!newNotification || !newNotification[0]) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Erreur lors de la création de la notification', 500));
        }

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        // Return success response
        res.status(200).json({ message: 'Votre compte a été créé avec succès. Veuillez vous connecter.' });

    } catch (error) {
        // If any error occurs, abort the transaction
        await session.abortTransaction();
        session.endSession();
        console.log(error);
        return next(new CustomError('Une erreur est survenue lors de la création de votre compte. Veuillez réessayer.', 500));
    }
});
//verifie email otp for store
const VerifyStoreOTP = asyncErrorHandler(async (req, res, next) => {
    const { store, otp } = req.body;
    // Validation
    if (!otp || !store || !mongoose.Types.ObjectId.isValid(store)) {
        return next(new CustomError('Tous les champs sont obligatoires', 400));
    }

    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Find the OTP linked to the store
        const otpRecord = await EmailOTPVerification.findOne({ store: store });

        // Check if OTP record exists
        if (!otpRecord) {
            return next(new CustomError('OTP introuvable', 400));
        }

        // Check if OTP has expired
        const currentTime = UtilMoment.getCurrentDateTime();
        if (currentTime.isAfter(otpRecord.expiresAt)) {
            return next(new CustomError('OTP a expiré. Veuillez en générer un nouveau', 400));
        }

        // Compare provided OTP with stored OTP (hashed)
        const isMatch = await bcrypt.comparePassword(otp.toString(), otpRecord.otp);
        if (!isMatch) {
            return next(new CustomError('OTP incorrect', 400));
        }

        // OTP is valid - Update the store status and delete the OTP in a transaction
        const storeUpdate = await Store.findByIdAndUpdate(
            store,
            { emailVerification: true },
            { session }
        );

        if (!storeUpdate) {
            throw new CustomError('Erreur lors de la vérification de l\'OTP', 500);
        }

        // Delete the OTP record
        const otpDeletion = await EmailOTPVerification.deleteOne({ store: store }).session(session);
        
        if (!otpDeletion.deletedCount) {
            throw new CustomError('Erreur lors de la suppression de l\'OTP', 500);
        }

        // Commit the transaction if both operations succeed
        await session.commitTransaction();
        session.endSession();

        // Return success message
        res.status(200).json({
            message: 'OTP vérifié avec succès. Veuillez vous connecter.',
        });
    } catch (err) {
        // Abort the transaction in case of any error
        await session.abortTransaction();
        session.endSession();
        console.log(err);
        return next(new CustomError('Erreur lors de la vérification de l\'OTP', 500));
    }
});

//singup store
const SignUpClient = asyncErrorHandler(async (req, res, next) => {
    const {Email, Password, FirstName, LastName, PhoneNumber,
        Wilaya, Commune, R_Commerce} = req.body;
    //check if all required fields are provide
    if([Password, FirstName, LastName, PhoneNumber, Wilaya, Commune, R_Commerce].some(field => !field)) {
        const err = new CustomError('Vous devez fournir tous les champs obligatoires', 400);
        return next(err);
    }
    
    const UserByPhone = await UserService.findUserByPhone(PhoneNumber);
    if(UserByPhone){
        const err = new CustomError('Numéro de téléphone déjà existant', 400);
        return next(err);
    }

    //check if email already exist
    if (Email) {
        if (!validator.isEmail(Email)) {
            const err = new CustomError('Email non valide', 400);
            return next(err);
        }

        const UserByEmail = await UserService.findUserByEmail(Email);

        if (UserByEmail) {
            const err = new CustomError('Email déjà existant', 400);
            return next(err);
        }
    }

    //check if the wilaya and commun exist
    const existWilaya = await CitiesService.findCitiesFRByCodeC(Wilaya, Commune);
    if(!existWilaya){
        const err = new CustomError('Wilaya ou commune introuvable', 404);
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
        wilaya: Wilaya, commune: Commune, 
        r_commerce: R_Commerce
    });
    if(!newUser){
        const err = new CustomError('Erreur lors de la création du compte, veuillez réessayer', 500);
        return next(err);
    }
    //send phone otp

    //return store
    res.status(200).json({message: 'Votre compte a été créé avec succès. Veuillez vous connecter'});
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
        return next(new CustomError('Tous les champs sont obligatoires', 400));
    }

    // Check if the phone number already exists
    const existingUserByPhone = await UserService.findUserByPhone(PhoneNumber);
    if (existingUserByPhone) {
        return next(new CustomError('Numéro de téléphone déjà existant', 400));
    }

    // Validate and check if the email already exists
    if (Email) {
        if (!validator.isEmail(Email)) {
            return next(new CustomError('Email non valide', 400));
        }

        const existingUserByEmail = await UserService.findUserByEmail(Email);
        if (existingUserByEmail) {
            return next(new CustomError('Email déjà existant', 400));
        }
    }

    // Check if the Wilaya and Commune exist
    const existWilaya = await CitiesService.findCitiesFRByCodeC(Wilaya, Commune);
    if (!existWilaya) {
        return next(new CustomError('Wilaya ou commune introuvable', 404));
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
            return next(new CustomError('Erreur lors de la création du client, veuillez réessayer.', 400));
        }
        // Create the MyStore entry
        await MyStores.create([{
            user: newUser[0]._id,
            store: store,
            status: 'approved',
        }], { session });

        // Commit the transaction if everything is successful
        await session.commitTransaction();

        // Return a detailed success message
        res.status(200).json({ message: `Profil client créé avec succès.`,});

    } catch (error) {
        // Abort the transaction in case of any errors
        await session.abortTransaction();
        next(new CustomError('Une erreur s\'est produite lors de la création du profil client, veuillez réessayer.', 500));
        console.error('Error creating client profile:', error);
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
        return next(new CustomError('Tous les champs sont obligatoires', 400));
    }

    // Check if the phone number already exists
    const existingUserByPhone = await UserService.findUserByPhone(PhoneNumber);
    if (existingUserByPhone) {
        return next(new CustomError('Numéro de téléphone déjà existant', 400));
    }

    // Validate and check if the email already exists
    if (Email) {
        if (!validator.isEmail(Email)) {
            return next(new CustomError('Email non valide', 400));
        }

        const existingUserByEmail = await UserService.findUserByEmail(Email);
        if (existingUserByEmail) {
            return next(new CustomError('Email déjà existant', 400));
        }
    }

    // Check if the Wilaya and Commune exist
    const existWilaya = await CitiesService.findCitiesFRByCodeC(Wilaya, Commune);
    if (!existWilaya) {
        return next(new CustomError('Wilaya ou commune introuvable', 404));
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
            return next(new CustomError('Erreur lors de la création du vendeur, veuillez réessayer.', 400));
        }
        // Create the MyStore entry
        await MyStores.create([{
            user: newUser[0]._id,
            store: store,
            status: 'approved',
            isSeller: true
        }], { session });

        // Commit the transaction if everything is successful
        await session.commitTransaction();

        // Return a detailed success message
        res.status(200).json({ message: `Profil vendeur créé avec succès.`,});

    } catch (error) {
        // Abort the transaction in case of any errors
        await session.abortTransaction();
        next(new CustomError('Une erreur s\'est produite lors de la création du profil vendeur, veuillez réessayer.', 500));
        console.error('Error creating seller profile:', error);
    } finally {
        // End the session
        session.endSession();
    }
});

// update store password
const UpdateStorePassword = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    const { OldPassword, NewPassword } = req.body;
    // Check if all required fields are provided
    if ([store, OldPassword, NewPassword].some(field => !field || validator.isEmpty(field))) {
        return next(new CustomError('Tous les champs sont obligatoires', 400));
    }
    // Check if the store exists
    const existStore = await StoreService.findStoreById(store);
    if (!existStore) {
        return next(new CustomError('Magasin introuvable', 404));
    }
    // Check if the old password is correct
    const isMatch = await bcrypt.comparePassword(OldPassword, existStore.password);
    if (!isMatch) {
        return next(new CustomError('Ancien mot de passe incorrect', 400));
    }
    // Hash the new password
    const hash = await bcrypt.hashPassword(NewPassword);
    // Update the store password
    existStore.password = hash;
    // Save the updated store
    const updatedStore = await existStore.save();
    if (!updatedStore) {
        return next(new CustomError('Erreur lors de la mise à jour du mot de passe', 500));
    }
    // Return success response
    res.status(200).json({ message: 'Votre mot de passe a été mis à jour avec succès' });
});
// update store email
const UpdateStoreEmail = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    const { Email } = req.body;
    // Check if all required fields are provided
    if ([store, Email].some(field => !field || validator.isEmpty(field))) {
        return next(new CustomError('Tous les champs sont obligatoires', 400));
    }
    // Check if the store exists
    const existStore = await StoreService.findStoreById(store);
    if (!existStore) {
        return next(new CustomError('Magasin introuvable', 404));
    }
    // Check if the email already exists
    const existingStoreByEmail = await StoreService.findStoreByEmail(Email);
    if (existingStoreByEmail) {
        return next(new CustomError('Email déjà existant', 400));
    }
    // Update the store email
    existStore.email = Email;
    // Save the updated store
    const updatedStore = await existStore.save();
    if (!updatedStore) {
        return next(new CustomError('Erreur lors de la mise à jour de l\'email', 500));
    }
    // Return success response
    res.status(200).json({ message: 'Votre email a été mis à jour avec succès' });
});
//forget password for client
const ForgetPasswordForClient = asyncErrorHandler(async (req, res, next) => {
    const { PhoneNumber } = req.body;
    try {
        // Validation
        if (!PhoneNumber || validator.isEmpty(PhoneNumber)) {
            return next(new CustomError('Veuillez fournir votre numéro de téléphone', 400));
        }
        
        // Check if phone number is valid algerian phone number
        if (!validator.isMobilePhone(PhoneNumber, 'ar-DZ')) {
            return next(new CustomError('Numéro de téléphone non valide', 400));
        }
        
        // Check if store with this phone number exists
        const existingClient = await UserService.findUserByPhone(PhoneNumber);
        
        if (!existingClient) {
            return next(new CustomError('Aucun compte trouvé avec ce numéro de téléphone', 404));
        }
        
        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000);
        
        // Hash the OTP
        const hashedOTP = await bcrypt.hashPassword(otp.toString());
        
        // Set to UTC time zone
        const currentTime = UtilMoment.getCurrentDateTime();
        
        // Store OTP with expiry time (1 hour)
        const otpData = {
            otp: hashedOTP,
            phoneNumber: PhoneNumber,
            userId: existingClient._id,
            accountType: 'client',
            createdAt: currentTime.toDate(),
            expiresAt: currentTime.add(1, 'hour').toDate(),
        };
        
        // Check if an OTP already exists for this user
        const existingOTP = await PasswordResetOTP.findOne({ 
            phoneNumber: PhoneNumber 
        });
        
        if (existingOTP) {
            // Update existing OTP
            await PasswordResetOTP.updateOne(
                { phoneNumber: PhoneNumber },
                otpData
            );
        } else {
            // Create new OTP record
            await PasswordResetOTP.create(otpData);
        }

        // Send OTP via Twilio
        const twilio = require('twilio')(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );
        
        await twilio.messages.create({
            body: `Votre code de vérification pour réinitialiser votre mot de passe est: ${otp}. Ce code est valable pendant 1 heure.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: PhoneNumber
        });
        
        res.status(200).json({ 
            message: 'Un code de vérification a été envoyé à votre numéro de téléphone.'
        });
    } catch (error) {
        console.log('Twilio Error:', error);
        return next(new CustomError('Erreur lors de l\'envoi du SMS. Veuillez réessayer.', 400));
    }
});
// forget password for store
const ForgetPasswordForStore = asyncErrorHandler(async (req, res, next) => {
    const { PhoneNumber } = req.body;
    try {
        // Validation
        if (!PhoneNumber || validator.isEmpty(PhoneNumber)) {
            return next(new CustomError('Veuillez fournir votre numéro de téléphone', 400));
        }
        
        // Check if phone number is valid algerian phone number
        if (!validator.isMobilePhone(PhoneNumber, 'ar-DZ')) {
            return next(new CustomError('Numéro de téléphone non valide', 400));
        }
        
        // Check if store with this phone number exists
        const existingStore = await StoreService.findStoreByPhone(PhoneNumber);
        
        if (!existingStore) {
            return next(new CustomError('Aucun compte trouvé avec ce numéro de téléphone', 404));
        }
        
        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000);
        
        // Hash the OTP
        const hashedOTP = await bcrypt.hashPassword(otp.toString());
        
        // Set to UTC time zone
        const currentTime = UtilMoment.getCurrentDateTime();
        
        // Store OTP with expiry time (1 hour)
        const otpData = {
            otp: hashedOTP,
            phoneNumber: PhoneNumber,
            userId: existingStore._id,
            accountType: 'store',
            createdAt: currentTime.toDate(),
            expiresAt: currentTime.add(1, 'hour').toDate(),
        };
        
        // Check if an OTP already exists for this user
        const existingOTP = await PasswordResetOTP.findOne({ 
            phoneNumber: PhoneNumber 
        });
        
        if (existingOTP) {
            // Update existing OTP
            await PasswordResetOTP.updateOne(
                { phoneNumber: PhoneNumber },
                otpData
            );
        } else {
            // Create new OTP record
            await PasswordResetOTP.create(otpData);
        }

        // Send OTP via Twilio
        const twilio = require('twilio')(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );
        
        await twilio.messages.create({
            body: `Votre code de vérification pour réinitialiser votre mot de passe est: ${otp}. Ce code est valable pendant 1 heure.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: PhoneNumber
        });
        
        res.status(200).json({ 
            message: 'Un code de vérification a été envoyé à votre numéro de téléphone.'
        });
    } catch (error) {
        console.log('Twilio Error:', error);
        return next(new CustomError('Erreur lors de l\'envoi du SMS. Veuillez réessayer.', 400));
    }
});
// Verify OTP for password reset
const VerifyResetOTP = asyncErrorHandler(async (req, res, next) => {
    const { PhoneNumber, VerificationCode } = req.body;
    
    // Validation
    if (!PhoneNumber || !VerificationCode) {
        return next(new CustomError('Tous les champs sont obligatoires', 400));
    }
    
    // Find the OTP record
    const otpRecord = await PasswordResetOTP.findOne({ phoneNumber: PhoneNumber });
    
    if (!otpRecord) {
        return next(new CustomError('Code de vérification introuvable ou expiré', 400));
    }
    
    // Check if OTP is expired
    const currentTime = UtilMoment.getCurrentDateTime();
    if (currentTime.isAfter(otpRecord.expiresAt)) {
        // Delete expired OTP
        await PasswordResetOTP.deleteOne({ phoneNumber: PhoneNumber });
        return next(new CustomError('Code de vérification expiré. Veuillez générer un nouveau code', 400));
    }
    
    // Verify OTP
    const isValid = await bcrypt.comparePassword(VerificationCode.toString(), otpRecord.otp);
    
    if (!isValid) {
        return next(new CustomError('Code de vérification incorrect', 400));
    }
    
    // OTP is valid - Mark as verified but don't delete yet (we'll need it for reset)
    await PasswordResetOTP.updateOne(
        { phoneNumber: PhoneNumber },
        { verified: true }
    );
    
    res.status(200).json({ 
        message: 'Code de vérification validé. Vous pouvez maintenant réinitialiser votre mot de passe.'
    });
});
// Reset password
const ResetPassword = asyncErrorHandler(async (req, res, next) => {
    const { PhoneNumber, VerificationCode, NewPassword } = req.body;
    
    // Validation
    if (!PhoneNumber || !VerificationCode || !NewPassword) {
        return next(new CustomError('Tous les champs sont obligatoires', 400));
    }
    
    // Check password strength
    // if (!validator.isStrongPassword(NewPassword)) {
    //     return next(new CustomError('Le mot de passe doit contenir au moins 8 caractères, une lettre majuscule, une lettre minuscule, un chiffre et un caractère spécial', 400));
    // }
    
    // Find the OTP record
    const otpRecord = await PasswordResetOTP.findOne({ 
        phoneNumber: PhoneNumber,
        verified: true
    });
    
    if (!otpRecord) {
        return next(new CustomError('Veuillez vérifier votre code avant de réinitialiser votre mot de passe', 400));
    }
    
    // Double check if OTP is expired
    const currentTime = UtilMoment.getCurrentDateTime();
    if (currentTime.isAfter(otpRecord.expiresAt)) {
        await PasswordResetOTP.deleteOne({ phoneNumber: PhoneNumber });
        return next(new CustomError('Session expirée. Veuillez recommencer le processus', 400));
    }
    
    // Verify OTP again for security
    const isValid = await bcrypt.comparePassword(VerificationCode.toString(), otpRecord.otp);
    
    if (!isValid) {
        return next(new CustomError('Code de vérification incorrect', 400));
    }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hashPassword(NewPassword);
    
    // Update password based on account type
    if (otpRecord.accountType === 'client') {
        await User.updateOne(
            { _id: otpRecord.userId },
            { password: hashedPassword }
        );
    } else if (otpRecord.accountType === 'store') {
        await Store.updateOne(
            { _id: otpRecord.userId },
            { password: hashedPassword }
        );
    } else {
        return next(new CustomError('Type de compte non reconnu', 400));
    }
    
    // Delete the OTP record
    await PasswordResetOTP.deleteOne({ phoneNumber: PhoneNumber });
    
    res.status(200).json({ 
        message: 'Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.'
    });
});

module.exports = {
    SignInAdmin,
    SignInStore,
    SignInClient,
    SignUpStore,
    SignUpStoreV2,
    VerifyStoreOTP,
    SignUpUpdateStore,
    SignUpClient,
    CreateNewClientForAStore,
    CreateNewSellerForAStore,
    UpdateStorePassword,
    UpdateStoreEmail,
    ForgetPasswordForStore,
    ForgetPasswordForClient,
    VerifyResetOTP,
    ResetPassword,
}