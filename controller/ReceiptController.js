const mongoose = require('mongoose');
const moment = require('moment');
const Receipt = require('../model/ReceiptModel.js');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const { ReceiptCode } = require('../util/Codification.js');
const { findUserById } = require('../service/UserService.js');
const { findStoreById } = require('../service/StoreService.js');
const { findReceiptById } = require('../service/ReceiptService.js');

//create a receipt
const CreateReceipt = asyncErrorHandler(async (req, res, next) => {
    const { client } = req.params;
    const { store, products, total, deliveredLocation, type } = req.body;
    const currentDateTime = moment().format('YYYY-MM-DD HH:mm:ss');
    //check if all feilds are provided
    if(!store || !products || !total || !client || !type ||
        !mongoose.Types.ObjectId.isValid(client) || 
        !mongoose.Types.ObjectId.isValid(store)
    ){
        return next(new CustomError('All fields are required', 400));
    }
    if(type == 'delivery' && !deliveredLocation){
        return next(new CustomError('Delivered location is required', 400));
    }
    //check if products have at least on product
    if(products.length <= 0){
        return next(new CustomError('You have to pick at least one product', 400));
    }
    //check if client exist
    const existingclient = await findUserById(client);
    if(!existingclient){
        return next(new CustomError('User not found', 404));
    }
    const code = await ReceiptCode(existingclient.code);
    if(code == null){
        const err = new CustomError('Code already existe. repeat the proccess', 405);
        return next(err);
    }
    //check if store exist
    const existingstore = await findStoreById(store);
    if(!existingstore){
        return next(new CustomError('Store not found', 404));
    }
    //create a new receipt
    const newreceipt = await Receipt.create({
        code: code,
        store: store,
        client: client,
        products: products,
        total: total,
        date: currentDateTime,
        type: type,
        deliveredLocation: deliveredLocation,
        delivered: false,
        status: 0
    });
    if(!newreceipt){
        const err = new CustomError('Error while creating new receipt, try again', 400);
        return next(err);
    }

    res.status(200).json({message: 'The order is submited successfully'});
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