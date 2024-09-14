const mongoose = require('mongoose');
const validator = require('validator');
const Purchase = require('../model/PurchaseModel.js');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const FournisseurService = require('../service/FournisseurService.js')
const StoreService = require('../service/StoreService.js');
const ProductService = require('../service/ProductService.js');
const PurchaseService = require('../service/PurchaseService.js');
const StockService = require('../service/StockService.js');
const StockStatusService = require('../service/StockStatusService.js');
const CitiesService = require('../service/CitiesService.js');
const moment = require('../util/Moment.js');


//create a new Purchase
const CreatePurchase = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    const { fournisseur, amount, products } = req.body;
    // check if all required fields are provided
    if(!store || !mongoose.Types.ObjectId.isValid(store) || 
        !fournisseur || !mongoose.Types.ObjectId.isValid(fournisseur) ||
         !amount || !products
    ){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    //check if products is empty
    if(!Array.isArray(products) || products.length < 1){
        const err = new CustomError('You have to select at least one product', 400);
        return next(err);
    }
    // Check if the amount is valid
    if (!validator.isNumeric(amount.toString()) || isNaN(amount) || Number(amount) <= 0) {
        const err = new CustomError('Enter a valid positive amount', 400);
        return next(err);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Parallel execution to speed up store and fournisseur validation
        const [existStore, existFournisseur] = await Promise.all([
            StoreService.findStoreById(store),
            FournisseurService.findFournisseurByIdANDStore(fournisseur, store)
        ]);

        if (!existStore) {
            throw new CustomError('Store not found', 404);
        }

        if (!existFournisseur) {
            throw new CustomError('Fournisseur not found', 404);
        }

        const productTasks = products.map(async (product) => {
            if (!product.productID || !mongoose.Types.ObjectId.isValid(product.productID)){
                throw new CustomError('Product not found', 400);
            }
            //check if the product exist in the store
            const existProduct = await ProductService.findProductById(product.productID);
            if(!existProduct){
                throw new CustomError('Product not found', 404);
            }
            if (!product.quantity || isNaN(product.quantity) || Number(product.quantity) <= 0) {
                throw new CustomError(`Enter a valid positive quantity for product ${product.name}`, 400);
            }
            if (!product.buying || isNaN(product.buying) || Number(product.buying) <= 0 ||
                !product.selling || isNaN(product.selling) || Number(product.selling) <= 0) {
                throw new CustomError(`Enter a valid positive buying and selling price for product ${product.name}`, 400);
            }

            if (Number(product.buying) > Number(product.selling)) {
                throw new CustomError(`The selling price must be greater than the buying price for product ${product.name}`, 400);
            }

            const newQuantity = Number(product.quantity) * Number(existProduct.boxItems);
            return {
                ...product,
                newQuantity,
            };
        });

        const productDetails = await Promise.all(productTasks);
        // Calculate totalAmount after resolving all promises
        const totalAmount = productDetails.reduce((acc, product) => acc + (product.buying * product.newQuantity), 0);
        if (Number(totalAmount) != Number(amount)) {
            throw new CustomError('The total amount does not match the sum of the products', 400);
        }
        // Set to UTC time zone
        const currentDateTime = moment.getCurrentDateTime(); // Ensures UTC+1
        let stockStatusIDs = [];
        for (const product of productDetails) {
            const stock = await StockService.findStockByStoreAndProduct(store, product.productID);
            if (stock) {
                // Add stock status if stock exists
                const stockStatus = await StockStatusService.createStockStatus(
                    currentDateTime,
                    stock._id,
                    product.buying,
                    product.selling,
                    product.newQuantity,
                    null,
                    session
                );

                if (!stockStatus) {
                    throw new CustomError('Error while creating stock status, try again.', 400);
                }

                stock.quantity += product.newQuantity;
                stock.buying = product.buying;
                stock.selling = product.selling;
                const updatedStock = await stock.save({ session });
                if (!updatedStock) {
                    throw new CustomError('Error while updating stock, try again.', 400);
                }

                //add stock status id to stockStatusIDs
                stockStatusIDs.push(stockStatus[0]._id);
            } else {
                // Create new stock and stock status if it doesn't exist
                const newStock = await StockService.createNewStock(product, store, session);
                if (!newStock) {
                    throw new CustomError('Error while creating stock, try again.', 400);
                }

                const stockStatus = await StockStatusService.createStockStatus(
                    currentDateTime,
                    newStock[0]._id,
                    product.buying,
                    product.selling,
                    product.newQuantity,
                    null,
                    session
                );

                if (!stockStatus) {
                    throw new CustomError('Error while creating stock status, try again.', 400);
                }

                //add stock status id to stockStatusIDs
                stockStatusIDs.push(stockStatus[0]._id);
            }
        }

        //check if stockStatusIDs is empty
        if(stockStatusIDs.length < 1 || stockStatusIDs.length != productDetails.length){
            throw new CustomError('Error while creating stock status, try again.', 400);
        }
        // Create new Purchase
        const newPurchase = await Purchase.create([{
            store: store,
            fournisseur: fournisseur,
            date: currentDateTime,
            totalAmount: totalAmount,
            credit: false,
            closed: false,
            deposit: false,
            stock: stockStatusIDs,
        }], { session });

        if (!newPurchase) {
            throw new CustomError('Error while creating purchase, try again.', 400);
        }

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: 'Purchase created successfully' });

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        return next(err);
    }
});

//fetch all Purchases
const GetPurchaseByID = asyncErrorHandler(async (req, res, next) => {
    const { id, store } = req.params;
    if(!id || !store ||
        !mongoose.Types.ObjectId.isValid(id) ||
        !mongoose.Types.ObjectId.isValid(store)
    ){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }

    //get all purchases by store
    const purchase = await Purchase.findOne({
        _id: id,
        store: store
    }).populate({
        path: 'fournisseur',
        select: 'firstName lastName phoneNumber address wilaya commune'
    }).populate({
        path: 'stock',
        select: 'stock buying quantity',
        populate: {
            path: 'stock',
            select: 'product',
            populate: {
                path: 'product',
                select: 'name size brand boxItems',
                populate: {
                    path: 'brand',
                    select: 'name'
                }
            }
        }
    });

    // Check if the purchase exists
    if (!purchase) {
        return next(new CustomError('Purchase not found', 404));
    }

    // Convert purchase to a plain object to make modifications
    const purchaseObj = purchase.toObject();

    // Fetch wilaya and commune details
    if (purchaseObj.fournisseur.wilaya && purchaseObj.fournisseur.commune) {
        const cities = await CitiesService.findCitiesFRByCodeC(purchaseObj.fournisseur.wilaya, purchaseObj.fournisseur.commune);

        if (cities) {
            // Overwrite wilaya and commune in the purchase object with the city names
            purchaseObj.fournisseur.wilaya = cities.wilaya;
            purchaseObj.fournisseur.commune = cities.baladiya;
        }
    }

    // Return the updated purchase object with the modified values
    res.status(200).json(purchaseObj);
});

//fetch all Purchases
const GetAllClosedPurchases = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    if(!store || !mongoose.Types.ObjectId.isValid(store)){
        const err = new CustomError('All fields are requiredddd', 400);
        return next(err);
    }
    
    //check if the store exist
    const existStore = await StoreService.findStoreById(store);
    if(!existStore){
        const err = new CustomError('Store not found', 404);
        return next(err);
    }

    //get all purchases by store
    const purchases = await Purchase.find({
        store: store,
        closed: true
    }).populate({
        path: 'fournisseur',
        select: 'firstName lastName'
    }).populate({
        path: 'stock',
        select: 'stock buying quantity',
        populate: {
            path: 'stock',
            select: 'product',
            populate: {
                path: 'product',
                select: 'name size brand',
                populate: {
                    path: 'brand',
                    select: 'name'
                }
            }
        }
    });

    //check if purchases found
    if(!purchases || purchases.length < 1){
        const err = new CustomError('No purchases found', 400);
        return next(err);
    }

    res.status(200).json(purchases);
});

//fetch all credited Purchases
const GetAllCreditedPurchases = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
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

    //get all purchases by store
    const purchases = await Purchase.find({
        store: store,
        credit: true,
        closed: false
    }).populate({
        path: 'fournisseur',
        select: 'firstName lastName'
    }).populate({
        path: 'stock',
        select: 'stock buying quantity',
        populate: {
            path: 'stock',
            select: 'product',
            populate: {
                path: 'product',
                select: 'name size brand',
                populate: {
                    path: 'brand',
                    select: 'name'
                }
            }
        }
    });

    //check if purchases found
    if(!purchases || purchases.length < 1){
        const err = new CustomError('No purchases found', 400);
        return next(err);
    }

    res.status(200).json(purchases);
});

//fetch all new Purchases
const GetAllNewPurchases = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
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

    //get all purchases by store
    const purchases = await Purchase.find({
        store: store,
        credit: false,
        closed: false,
        payment: { $size: 0 }
    }).populate({
        path: 'fournisseur',
        select: 'firstName lastName'
    }).populate({
        path: 'stock',
        select: 'stock buying quantity',
        populate: {
            path: 'stock',
            select: 'product',
            populate: {
                path: 'product',
                select: 'name size brand',
                populate: {
                    path: 'brand',
                    select: 'name'
                }
            }
        }
    });

    //check if purchases found
    if(!purchases || purchases.length < 1){
        const err = new CustomError('No purchases found', 400);
        return next(err);
    }

    res.status(200).json(purchases);
});

//fetch all purchases by fournisseur
const GetAllPurchasesByFournisseurForSpecificStore = asyncErrorHandler(async (req, res, next) => {
    const { store, fournisseur } = req.params;
    if(!store || !mongoose.Types.ObjectId.isValid(store) || 
        !fournisseur || !mongoose.Types.ObjectId.isValid(fournisseur)){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }

    //check if the store exist
    const existStore = await StoreService.findStoreById(store);
    if(!existStore){
        const err = new CustomError('Store not found', 404);
        return next(err);
    }
    //check if the fournisseur exist
    const existFournisseur = await FournisseurService.findFournisseurByIdANDStore(fournisseur, store);
    if(!existFournisseur){
        const err = new CustomError('Fournisseur not found', 404);
        return next(err);
    }
    //get all purchases by store
    const purchases = await Purchase.find({
        store: store,
        fournisseur: fournisseur
    }).populate({
        path: 'stock',
        select: 'stock buying quantity',
        populate:{
            path: 'stock',
            select: 'product',
            populate: {
                path: 'product',
                select: 'name size brand',
                populate: {
                    path: 'brand',
                    select: 'name' 
                }
            }
        }
    });
    //check if purchases found
    if(!purchases || purchases.length < 1){
        const err = new CustomError('No purchases found', 400);
        return next(err);
    }
    //return the purchases
    res.status(200).json(purchases);
});

//update Purchase Credit
const UpdatePurchaseCredited = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { credited, store } = req.body;
    if(!id || !store ||
        !mongoose.Types.ObjectId.isValid(id) ||
        !mongoose.Types.ObjectId.isValid(store)
    ){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    if(!validator.isBoolean(credited.toString())){
        const err = new CustomError('Enter a valid value', 400);
        return next(err);
    }

    //check if the purchase exist
    const existPurchase = await PurchaseService.findPurchaseByIdAndStore(id, store);
    if(!existPurchase){
        const err = new CustomError('Purchase not found', 404);
        return next(err);
    }

    //update
    if(credited === false){
        // Clear the payment array first
        existPurchase.payment = [];
    }
    existPurchase.credit = credited;

    // Update Purchase
    const updatedPurchase = await existPurchase.save();

    // Check if Purchase updated successfully
    if (!updatedPurchase) {
        const err = new CustomError('Error while updating purchase, try again.', 400);
        return next(err);
    }

    res.status(200).json({ message: `Purchase now is ${credited ? "" : "not "}credited` });
});

//update Purchase Deposit
const UpdatePurchaseDeposit = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { deposit, store  } = req.body;
    if(!id || !store ||
        !mongoose.Types.ObjectId.isValid(id) ||
        !mongoose.Types.ObjectId.isValid(store)
    ){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    if(!validator.isBoolean(deposit.toString())){
        const err = new CustomError('Enter a valid value', 400);
        return next(err);
    }

    //check if the purchase exist
    const existPurchase = await PurchaseService.findPurchaseByIdAndStore(id, store);
    if(!existPurchase){
        const err = new CustomError('Purchase not found', 404);
        return next(err);
    }

    //update
    existPurchase.deposit = deposit;

    // Update Purchase
    const updatedPurchase = await existPurchase.save();

    // Check if Purchase updated successfully
    if (!updatedPurchase) {
        const err = new CustomError('Error while updating purchase, try again.', 400);
        return next(err);
    }

    res.status(200).json({ message: `Purchase now is ${deposit ? "" : "not "}deposit` });
});

//add payments tp purchase
const AddPaymentToPurchase = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { amount, store } = req.body;
    
    // Get current date with Algiers timezone
    const currentDateTime = moment.getCurrentDateTime(); // Ensures UTC+1

    // Validate ID
    if(!id || !store ||
        !mongoose.Types.ObjectId.isValid(id) ||
        !mongoose.Types.ObjectId.isValid(store)
    ){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }

    // Check if the amount is valid
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
        const err = new CustomError('Enter a valid positive amount', 400);
        return next(err);
    }

    // Find the existing purchase
    const existPurchase = await Purchase.findOne({
        _id: id,
        store: store,
    }).populate({
        path: 'stock',
        select: 'stock buying quantity',
    });
    if (!existPurchase) {
        const err = new CustomError('Purchase not found', 404);
        return next(err);
    }

    //check if the purchase is closed
    if (existPurchase.closed) {
        const err = new CustomError('You purchase is closed once everything is paid.', 400);
        return next(err);
    }

    //check if the purchase is credited
    if (existPurchase.credit == false) {
        const err = new CustomError('Your can\'t add payment because this purchase is not credited', 400);
        return next(err);
    }

    // Check if the total amount and sum of existing payments are considered
    const totalPayments = existPurchase.payment.reduce((sum, payment) => sum + payment.amount, 0);
    if (totalPayments + Number(amount) > Number(existPurchase.totalAmount)) {
        const err = new CustomError('Payment amount exceeds the total amount due', 400);
        return next(err);
    }
    if(totalPayments + Number(amount) == Number(existPurchase.totalAmount)){
        existPurchase.closed = true;
    }

    // Add the payment to the purchase
    existPurchase.payment.push({
        date: currentDateTime,
        amount: Number(amount)
    });

    // Save the updated purchase
    const updatedPurchase = await existPurchase.save();

    // Check if the purchase was updated successfully
    if (!updatedPurchase) {
        const err = new CustomError('Error while adding a new payment, try again.', 400);
        return next(err);
    }

    res.status(200).json({ message: 'Payment added successfully' });
});

//add payments tp purchase
const AddFullPaymentToPurchase = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { store } = req.body;
    
    // Get current date with Algiers timezone
    const currentDateTime = moment.getCurrentDateTime(); // Ensures UTC+1

    // Validate ID
    if(!id || !store ||
        !mongoose.Types.ObjectId.isValid(id) ||
        !mongoose.Types.ObjectId.isValid(store)
    ){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }

    // Find the existing purchase
    const existPurchase = await Purchase.findOne({
        _id: id,
        store: store,
    });
    if (!existPurchase) {
        const err = new CustomError('Purchase not found', 404);
        return next(err);
    }

    //check if the purchase is closed
    if (existPurchase.closed) {
        const err = new CustomError('Your purchase is already closed', 400);
        return next(err);
    }

    //check if the purchase is credited
    if (existPurchase.credit == true) {
        const err = new CustomError('You can\'t add full payment because this purchase is credited', 400);
        return next(err);
    }

    // Clear the payment array first
    existPurchase.payment = [];
    // Add the payment to the purchase
    existPurchase.payment.push({
        date: currentDateTime,
        amount: Number(existPurchase.totalAmount)
    });
    existPurchase.closed = true;
    existPurchase.deposit = false;
    existPurchase.credit = false;


    // Save the updated purchase
    const updatedPurchase = await existPurchase.save();

    // Check if the purchase was updated successfully
    if (!updatedPurchase) {
        const err = new CustomError('Error while adding a full payment, try again.', 400);
        return next(err);
    }

    res.status(200).json({ message: 'Full payment added successfully' });
});

//delete Purchase
const DeletePurchase = asyncErrorHandler(async (req, res, next) => {
    const { id, store } = req.params;

    // Validate ID
    if(!id || !store ||
        !mongoose.Types.ObjectId.isValid(id) ||
        !mongoose.Types.ObjectId.isValid(store)
    ){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }

    // Check if Purchase exists
    const existPurchase = await PurchaseService.findPurchaseByIdAndStore(id, store);
    if (!existPurchase) {
        return next(new CustomError('Purchase not found', 404));
    }

    // Check if the purchase is closed
    if (existPurchase.closed) {
        return next(new CustomError('You can\'t delete a closed purchase', 400));
    }

    // Check if there is any stock related to this purchase
    const stockStatuses = await Promise.all(
        existPurchase.stock.map(stockStatusID => StockStatusService.findStockStatusById(stockStatusID))
    );

    // If any stock status exists, handle accordingly
    if (stockStatuses.some(stockStatus => stockStatus !== null)) {
        return next(new CustomError('Cannot delete purchase with associated stock. Please remove the stock first.', 400));
    }

    // Delete Purchase
    const deletedPurchase = await Purchase.deleteOne({ _id: existPurchase._id });

    // Check if Purchase was deleted successfully
    if (deletedPurchase.deletedCount === 0) {
        return next(new CustomError('Error while deleting purchase, please try again.', 400));
    }

    res.status(200).json({ message: 'Purchase deleted successfully' });
});

//get statistics purchase for specific store and fournisseur
const GetStatisticsForStoreFournisseur = asyncErrorHandler(async (req, res, next) => {
    const { store, fournisseur } = req.params;

    // Validate store and fournisseur IDs
    if (!store || !mongoose.Types.ObjectId.isValid(store) || 
        !fournisseur || !mongoose.Types.ObjectId.isValid(fournisseur)) {
        return next(new CustomError('Invalid store or fournisseur ID provided.', 400));
    }

    // Check if the store exists
    const existStore = await StoreService.findStoreById(store);
    if (!existStore) {
        return next(new CustomError('Store not found', 404));
    }

    // Check if the fournisseur exists for the given store
    const existFournisseur = await FournisseurService.findFournisseurByIdANDStore(fournisseur, store);
    if (!existFournisseur) {
        return next(new CustomError('Fournisseur not found', 404));
    }

    // Get statistics for purchases between the store and fournisseur
    const totalPurchases = await PurchaseService.countPurchasesByStoreAndFournisseur(store, fournisseur);
    const totalAmount = await PurchaseService.sumAmountsForAllPurchases(store, fournisseur);
    const totalPayment = await PurchaseService.sumPaymentsForAllPurchases(store, fournisseur);
    const totalCreditUnpaid = await PurchaseService.sumPaymentsForCreditedUnpaidPurchases(store, fournisseur);

    // Respond with the statistics
    res.status(200).json({
        count: totalPurchases,
        totalAmount: totalAmount,
        totalPayment: totalPayment,
        totalCreditUnpaid: totalCreditUnpaid,
    });
});

module.exports = {
    CreatePurchase,
    GetAllClosedPurchases,
    GetPurchaseByID,
    GetAllCreditedPurchases,
    GetAllNewPurchases,
    GetAllPurchasesByFournisseurForSpecificStore,
    UpdatePurchaseCredited,
    UpdatePurchaseDeposit,
    AddPaymentToPurchase,
    AddFullPaymentToPurchase,
    DeletePurchase,
    GetStatisticsForStoreFournisseur
}