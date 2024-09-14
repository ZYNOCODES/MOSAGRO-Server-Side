const mongoose = require('mongoose');
const validator = require('validator');
const ReceiptStatus = require('../model/ReceiptStatusModel.js');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const ReceiptService = require('../service/ReceiptService.js');
const moment = require('../util/Moment.js');
const path = require('path');

//add new ReceiptStatus to specific receipt
const CreateNewReceiptStatusForReceipt = asyncErrorHandler(async (req, res, next) => {
    const { receipt } = req.params;
    const { products, store } = req.body;
    console.log(products);
    // Check if all required fields are provided
    if (!receipt || validator.isEmpty(receipt.toString()) ||
        !mongoose.Types.ObjectId.isValid(receipt) ||
        !store || validator.isEmpty(store.toString()) ||
        !mongoose.Types.ObjectId.isValid(store) ||
        !products || products.length <= 0 
        
    ) {
        return next(new CustomError('All fields are required', 400));
    }

    // Check if store already exists
    const existingReceipt = await ReceiptService.findReceiptByIdAndStore(receipt, store);
    if (!existingReceipt) {
        return next(new CustomError('Receipt not found', 404));
    }

    //get last receipt status
    const lastReceiptStatus = await ReceiptStatus.findOne({
        _id: existingReceipt.products[existingReceipt.products.length - 1]
    });
    if (!lastReceiptStatus) {
        return next(new CustomError('Receipt status not found', 404));
    }

    //get current datetime
    const currentDateTime = moment.getCurrentDateTime();

    const session = await mongoose.startSession();
    session.startTransaction();

    try{
        // Adjust product quantities based on the difference from the last receipt status
        const updatedProducts = lastReceiptStatus.products.map((product) => {
            const matchingProduct = products.find(
                (newproduct) => newproduct.product.toString() === product.product.toString() &&
                                newproduct.stock.toString() === product.stock.toString()
            );

            // If a matching product exists in the previous status, subtract the new quantity from the old quantity
            if (matchingProduct) {
                let adjustedQuantity = Number(product.quantity);
                adjustedQuantity = Number(product.quantity) - Number(matchingProduct.quantity);
                //delete product if quantity is zero or no change was made
                if (adjustedQuantity < 0 || adjustedQuantity == Number(product.quantity)) {
                    return null;
                }
                return {
                    ...product,
                    quantity: adjustedQuantity,
                    price: product.price
                };
            }else{
                return product;
            }
            
        });

        // check if any product if there is no change was made between the last status and the new status
        if (!updatedProducts[0] || updatedProducts.length <= 0) {
            return next(new CustomError('No changes were made to the receipt status', 400));
        }

        // If changes exist, create a new ReceiptStatus
        const newReceiptStatus = await ReceiptStatus.create([
            {
                receipt: existingReceipt._id,
                products: updatedProducts,
                date: currentDateTime
            }
        ], { session });
        //check if new status was created
        if (!newReceiptStatus[0]) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Error while creating new receipt status, try again.', 400));
        }

        //update receipt total and profit
        const newtotal = updatedProducts.reduce((acc, product) => {
            return acc + (Number(product.price) * Number(product.quantity));
        }, 0);
        const newprofit = Number(newtotal) * Number(existingReceipt.profit) / Number(existingReceipt.total);


        existingReceipt.total = newtotal;
        existingReceipt.profit = newprofit;
        existingReceipt.products.push(newReceiptStatus[0]._id);

        //save receipt
        const updatedReceipt = await existingReceipt.save({ session });
        if (!updatedReceipt) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Error while updating receipt, try again.', 400));
        }


        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        // Return the newly created receipt status
        res.status(200).json({message: 'New receipt status created successfully'});
    }catch(err){
        await session.abortTransaction();
        session.endSession();
        console.log(err);
        next(new CustomError('Error while creating new receipt status, try again.', 400));
    }

});
//fetch last receipt status by receipt
const FetchLiveReceiptStatusByReceipt = asyncErrorHandler(async (req, res, next) => {
    const { id, store } = req.params;
    //validate required fields
    if (!id || !mongoose.Types.ObjectId.isValid(id) ||
        !store || !mongoose.Types.ObjectId.isValid(store)
    ) {
        return next(new CustomError('All fields are required', 400));
    }
    //check if stock already exist
    const existingReceipt = await ReceiptService.findReceiptByIdAndStore(id, store);
    if(!existingReceipt){
        const err = new CustomError('Receipt not found', 404);
        return next(err);
    }

    //get last receipt status
    const lastReceiptStatus = await ReceiptStatus.findOne({
        _id: existingReceipt.products[existingReceipt.products.length - 1]
    }).populate(
        {
            path: 'products.product',
            select: 'name size brand boxItems image',
            populate: {
                path: 'brand',
                select: 'name'
            }
        }
    );

    if (!lastReceiptStatus) {
        return next(new CustomError('Receipt status not found', 404));
    }

    res.status(200).json(lastReceiptStatus);
});
//fecth all receipt status by receipt
const FetchAllReceiptStatusByReceipt = asyncErrorHandler(async (req, res, next) => {
    const { id, store } = req.params;
    //validate required fields
    if (!id || !mongoose.Types.ObjectId.isValid(id) ||
        !store || !mongoose.Types.ObjectId.isValid(store)
    ) {
        return next(new CustomError('All fields are required', 400));
    }
    //check if stock already exist
    const existingReceipt = await ReceiptService.findReceiptByIdAndStore(id, store);
    if(!existingReceipt){
        const err = new CustomError('Receipt not found', 404);
        return next(err);
    }

    //get all receipt status
    const allReceiptStatus = await ReceiptStatus.find({
        _id: existingReceipt.products
    }).populate(
        {
            path: 'products.product',
            select: 'name size brand boxItems',
            populate: {
                path: 'brand',
                select: 'name'
            }
        }
    );

    if (!allReceiptStatus || allReceiptStatus.length <= 0) {
        return next(new CustomError('Receipt status not found', 404));
    }

    res.status(200).json(allReceiptStatus);
});

module.exports = {
    CreateNewReceiptStatusForReceipt,
    FetchLiveReceiptStatusByReceipt,
    FetchAllReceiptStatusByReceipt
};