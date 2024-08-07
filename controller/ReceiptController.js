const mongoose = require('mongoose');
const Receipt = require('../model/ReceiptModel.js');
const Stock = require('../model/StockModel');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const validator = require('validator');
const moment = require('moment');
require('moment-timezone');
const { ReceiptCode } = require('../util/Codification.js');
const { findUserById } = require('../service/UserService.js');
const { findStoreById } = require('../service/StoreService.js');
const { findReceiptById } = require('../service/ReceiptService.js');
const { checkUserStore } = require('../service/MyStoreService.js');

//create a receipt
const CreateReceipt = asyncErrorHandler(async (req, res, next) => {
    const { client } = req.params;
    const { store, products, total, deliveredLocation, type } = req.body;
    //get current date with algeire timezome
    const currentDateTime = moment.tz('Africa/Algiers').format();

    // Check if all fields are provided
    if (!store || !products || !total || !client || !type ||
        !mongoose.Types.ObjectId.isValid(client) || 
        !mongoose.Types.ObjectId.isValid(store) ||
        !Array.isArray(products) || !validator.isNumeric(total.toString())
    ) {
        return next(new CustomError('All fields are required', 400));
    }
    if (type === 'delivery' && !deliveredLocation) {
        return next(new CustomError('Delivered location is required', 400));
    }
    if (products.length <= 0) {
        return next(new CustomError('You have to pick at least one product', 400));
    }
    
    // Check if all products have a quantity and price
    if (products.some(val => {
        return (!mongoose.Types.ObjectId.isValid(val.product)) && 
               (!val.quantity || val.quantity <= 0 || !validator.isNumeric(val.quantity.toString())) && 
               (!val.price || val.price <= 0 || !validator.isNumeric(val.price.toString()));
    })) {
        return next(new CustomError('All products must have a valid quantity and price', 400));
    }
    //check if total is equal to the sum of all products
    const sum = products.reduce((acc, product) => acc + product.price * product.quantity, 0);
    if (sum != total) {
        return next(new CustomError('Total is not equal to the sum of all products price', 400));
    }
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Check if client exists
        const existingClient = await findUserById(client, session);
        if (!existingClient) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('User not found', 404));
        }

        // Check if store exists
        const existingStore = await findStoreById(store, session);
        if (!existingStore) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Store not found', 404));
        }
        //check if client is a client for the store
        const isClient = await checkUserStore(client, store, session);
        if (!isClient) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('You are not a client for this store', 405));
        }
        var totalProfit = 0;
        //check if the all products exist
        for (const item of products) {
            const existingProduct = await Stock.findById(item.product).session(session);
            //calculate profit
            totalProfit += (
                item.price - existingProduct.price[existingProduct.price.length -1].buying
            ) * item.quantity;
            if (!existingProduct) {
                await session.abortTransaction();
                session.endSession();
                return next(new CustomError(`Product not found`, 404));
            }
        }
        // Check if the total profit is not negative
        if (totalProfit < 0) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Total profit cannot be negative', 405));
        }
        // Generate receipt code
        const code = await ReceiptCode(existingClient.code, session);
        if (code == null) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Code already exists. Repeat the process', 405));
        }

        // Create a new receipt
        await Receipt.create([{
            code: code,
            store: store,
            client: client,
            products: products,
            total: total,
            profit: totalProfit,
            date: currentDateTime,
            type: type,
            deliveredLocation: type != 'delivery' ? null : deliveredLocation,
            delivered: false,
            status: 0
        }], { session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: 'The order is submitted successfully' });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.log(error);
        return next(new CustomError('Error while creating new receipt, try again', 500));
    }
});
//get specific Receipt
const GetReceiptByID = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    //check id 
    if( !id || !mongoose.Types.ObjectId.isValid(id)){
        return next(new CustomError('All fields are required', 400));
    }
    const existingreceipt = Receipt.findById(id);
    if(!existingreceipt){
        return next(new CustomError('Receipt not found', 404));
    }
    res.status(200).json(existingreceipt);
});
//get all none delivered receipts by store
const GetAllNonedeliveredReceiptsByStore = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    //check id 
    if( !id || !mongoose.Types.ObjectId.isValid(id)){
        return next(new CustomError('All fields are required', 400));
    }
    const receipts = await Receipt.find({
        store: id,
        delivered: false
    });
    if(receipts.length <= 0){
        const err = new CustomError('No receipts found for you', 400);
        return next(err);
    }
    res.status(200).json(receipts);
});
//get all delivered receipts by store
const GetAlldeliveredReceiptsByStore = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    //check id 
    if( !id || !mongoose.Types.ObjectId.isValid(id)){
        return next(new CustomError('All fields are required', 400));
    }
    const receipts = await Receipt.find({
        store: id,
        delivered: true
    });
    if(receipts.length <= 0){
        const err = new CustomError('No delivered receipts found for you', 400);
        return next(err);
    }
    res.status(200).json(receipts);
});
//get all receipts by client
const GetAllReceiptsByClient = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    //check id 
    if( !id || !mongoose.Types.ObjectId.isValid(id)){
        return next(new CustomError('All fields are required', 400));
    }
    const receipts = await Receipt.find({
        client: id
    });
    if(receipts.length <= 0){
        const err = new CustomError('No receipts found for you', 400);
        return next(err);
    }
    res.status(200).json(receipts);
});
//validate delivered
const ValidateMyReceipt = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    //check id 
    if( !id || !mongoose.Types.ObjectId.isValid(id)){
        return next(new CustomError('All fields are required', 400));
    }
    //check if receipt exist
    const existingreceipt = await findReceiptById(id);
    if(!existingreceipt){
        return next(new CustomError('Receipt not found', 404));
    }
    //update 
    const updatedreceipt = await Receipt.updateOne({ _id: id }, { 
        delivered: true
    });
    // Check if receipt updated successfully
    if (!updatedreceipt) {
        const err = new CustomError('Error while updating receipt, try again.', 400);
        return next(err);
    }
    res.status(200).json({ message: 'The validation was submited successfully' });
});
//update receipt expexted delivery date
const UpdateReceiptExpextedDeliveryDate = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { date } = req.body;
    //check the fields
    if( !id || !date 
        || !mongoose.Types.ObjectId.isValid(id)){
        return next(new CustomError('All fields are required', 400));
    }
    //check if receipt exist
    const existingreceipt = await findReceiptById(id);
    if(!existingreceipt){
        return next(new CustomError('Receipt not found', 404));
    }
    //update 
    const updatedreceipt = await Receipt.updateOne({ _id: id }, { 
        expextedDeliveryDate: date
    });
    // Check if receipt updated successfully
    if (!updatedreceipt) {
        const err = new CustomError('Error while updating receipt, try again.', 400);
        return next(err);
    }
    res.status(200).json({ message: 'The expexted delivery date was submited successfully' });
});
//delete receiot
const DeleteReceipt = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    //check id 
    if( !id || !mongoose.Types.ObjectId.isValid(id)){
        return next(new CustomError('All fields are required', 400));
    }
    //check if receipt exist
    const existingreceipt = await findReceiptById(id);
    if(!existingreceipt){
        return next(new CustomError('Receipt not found', 404));
    }
    const DeletedReceipt = await Receipt.deleteOne({_id: id});
    if(!DeletedReceipt){
        const err = new CustomError('Error while deleting receipt, try again', 400);
        return next(err);
    }
    res.status(200).json({message: 'Receipt deleted successfully'});
});
module.exports = {
    CreateReceipt,
    GetReceiptByID,
    GetAllNonedeliveredReceiptsByStore,
    GetAlldeliveredReceiptsByStore,
    GetAllReceiptsByClient,
    ValidateMyReceipt,
    UpdateReceiptExpextedDeliveryDate,
    DeleteReceipt,
}