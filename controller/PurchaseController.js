const mongoose = require('mongoose');
const validator = require('validator');
const Purchase = require('../model/PurchaseModel.js');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const FournisseurService = require('../service/FournisseurService.js')
const StoreService = require('../service/StoreService.js')
const PurchaseService = require('../service/PurchaseService.js')
const moment = require('moment');
require('moment-timezone');

//create a new Purchase
const CreatePurchase = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    const { fournisseur, date, amount } = req.body;
    // check if all required fields are provided
    if(!store || !mongoose.Types.ObjectId.isValid(store) || 
        !fournisseur || !mongoose.Types.ObjectId.isValid(fournisseur) ||
        !date || !amount
    ){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    //check if the date is valid
    if(date && !validator.isDate(date)){
        const err = new CustomError('Enter a valid date', 400);
        return next(err);
    }
    // Check if the amount is valid
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
        const err = new CustomError('Enter a valid positive amount', 400);
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

    //create new purchase
    const newPurchase = await Purchase.create({
        store: store,
        fournisseur: fournisseur, 
        date: date,
        TotalAmount: amount,
    });

    //check if Fournisseur created successfully
    if(!newPurchase){
        const err = new CustomError('Error while creating purchase try again.', 400);
        return next(err);
    }
    res.status(200).json({message: 'Purchase created successfully'});
});

//fetch all Purchases
const GetPurchaseByID = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    if(!id || !mongoose.Types.ObjectId.isValid(id)){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }

    //get all purchases by store
    const purchase = await Purchase.findById(id).populate({
        path: 'fournisseur',
        select: 'firstName lastName'
    }).populate({
        path: 'stock',
        select: 'buying quantity',
        populate: {
            path: 'product',
            select: 'name size'
        }
    });

    //check if purchases found
    if(!purchase){
        const err = new CustomError('Purchase not found', 404);
        return next(err);
    }

    res.status(200).json(purchase);
});

//fetch all Purchases
const GetAllPurchases = asyncErrorHandler(async (req, res, next) => {
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
    }).populate({
        path: 'fournisseur',
        select: 'firstName lastName'
    }).populate({
        path: 'stock',
        select: 'buying quantity',
        populate: {
            path: 'product',
            select: 'name size'
        }
    });;

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
        select: 'buying quantity',
        populate: {
            path: 'product',
            select: 'name size'
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
    });

    //check if purchases found
    if(!purchases || purchases.length < 1){
        const err = new CustomError('No purchases found', 400);
        return next(err);
    }

    res.status(200).json(purchases);
});

//update Purchase
const UpdatePurchase = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { credited, date } = req.body;
    if(!id || !mongoose.Types.ObjectId.isValid(id)){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    if(!validator.isBoolean(credited) && !date){
        const err = new CustomError('One of the fields are required', 400);
        return next(err);
    }
    //check if the date is valid
    if(date && !validator.isDate(date)){
        const err = new CustomError('Enter a valid date', 400);
        return next(err);
    }

    //check if the purchase exist
    const existPurchase = await PurchaseService.findPurchaseById(id);
    if(!existPurchase){
        const err = new CustomError('Purchase not found', 404);
        return next(err);
    }

    //update
    if (date) existPurchase.date = date;
    if (validator.isBoolean(credited)) existPurchase.credit = credited;

    // Update Purchase
    const updatedPurchase = await existPurchase.save();

    // Check if Purchase updated successfully
    if (!updatedPurchase) {
        const err = new CustomError('Error while updating purchase, try again.', 400);
        return next(err);
    }

    res.status(200).json({ message: 'Purchase updated successfully' });
});

//add payments tp purchase
const AddPaymentToPurchase = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { amount } = req.body;
    
    // Get current date with Algiers timezone
    const currentDateTime = moment.tz('Africa/Algiers').format();

    // Validate ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        const err = new CustomError('Invalid Purchase ID', 400);
        return next(err);
    }

    // Check if the amount is valid
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
        const err = new CustomError('Enter a valid positive amount', 400);
        return next(err);
    }

    // Find the existing purchase
    const existPurchase = await Purchase.findById(id).populate({
        path: 'stock',
        select: 'buying quantity',
        populate: {
            path: 'product',
            select: 'name size'
        }
    });
    if (!existPurchase) {
        const err = new CustomError('Purchase not found', 404);
        return next(err);
    }

    //check if the purchase is closed
    if (existPurchase.closed) {
        const err = new CustomError('Your purchase is complete once everything is paid.', 400);
        return next(err);
    }

    //check if the total price of all stock is equal to existPurchase.TotalAmount
    const totalBuyingStock = existPurchase.stock.reduce((sum, stock) => sum + (stock.buying * stock.quantity), 0);
    if (totalBuyingStock != existPurchase.TotalAmount) {
        const errorMessage = `You cannot add a payment until you have finished adding all the products to this purchase. The total price of products in this purchase is ${totalBuyingStock}. Please complete the addition of all products before making a payment.`;
        const err = new CustomError(errorMessage, 400);
        return next(err);
    }

    // Check if the purchase is on credit
    if (existPurchase.credit) {
        // Check if the total amount and sum of existing payments are considered
        const totalPayments = existPurchase.payment.reduce((sum, payment) => sum + payment.amount, 0);
        if (totalPayments + Number(amount) > existPurchase.TotalAmount) {
            const err = new CustomError('Payment amount exceeds the total amount due', 400);
            return next(err);
        }
        if(totalPayments + Number(amount) == existPurchase.TotalAmount){
            existPurchase.closed = true;
        }
    } else {
        // If not credit, the payment must match the total amount exactly
        if (Number(amount) != existPurchase.TotalAmount) {
            const err = new CustomError('Payment amount must match the total amount due', 400);
            return next(err);
        }
        if(Number(amount) == existPurchase.TotalAmount){
            existPurchase.closed = true;
        }

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

//delete Purchase
const DeletePurchase = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    // check if all required fields are provided
    if(!id || !mongoose.Types.ObjectId.isValid(id)){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }

    // Check if Purchase exists
    const existPurchase = await PurchaseService.findPurchaseById(id);
    if(!existPurchase){
        const err = new CustomError('Purchase not found', 404);
        return next(err);
    }

    //delete Purchase
    const deletedPurchase = await Purchase.deleteOne({_id: existPurchase._id});
    //check if Purchase deleted successfully
    if(!deletedPurchase){
        const err = new CustomError('Error while deleting purchase try again.', 400);
        return next(err);
    }
    res.status(200).json({message: 'Purchase deleted successfully'});
});

module.exports = {
    CreatePurchase,
    GetAllPurchases,
    GetPurchaseByID,
    GetAllCreditedPurchases,
    GetAllNewPurchases,
    UpdatePurchase,
    AddPaymentToPurchase,
    DeletePurchase
}