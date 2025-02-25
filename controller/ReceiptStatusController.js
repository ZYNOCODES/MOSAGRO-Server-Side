const mongoose = require('mongoose');
const validator = require('validator');
const ReceiptStatus = require('../model/ReceiptStatusModel.js');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const ReceiptService = require('../service/ReceiptService.js');
const moment = require('../util/Moment.js');
const Stock = require('../model/StockModel.js');

//add new ReceiptStatus to specific receipt
const CreateNewReceiptStatusForReceipt = asyncErrorHandler(async (req, res, next) => {
    const { receipt, store } = req.params;
    const { products } = req.body;

    // Validate required fields
    if (!receipt || validator.isEmpty(receipt.toString()) || !mongoose.Types.ObjectId.isValid(receipt) ||
        !store || validator.isEmpty(store.toString()) || !mongoose.Types.ObjectId.isValid(store) ||
        !products || products.length <= 0) {
        return next(new CustomError('All fields are required', 400));
    }

    // Check if the receipt exists
    const existingReceipt = await ReceiptService.findReceiptByIdAndStore(receipt, store);
    if (!existingReceipt) {
        return next(new CustomError('Receipt not found', 404));
    }

    // Get the last receipt status
    const lastReceiptStatus = await ReceiptStatus.findById(existingReceipt.products[existingReceipt.products.length - 1]);
    if (!lastReceiptStatus) {
        return next(new CustomError('Receipt status not found', 404));
    }

    // Get current datetime
    const currentDateTime = moment.getCurrentDateTime();

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Adjust product quantities based on the difference from the last receipt status
        const updatedProducts = lastReceiptStatus.products.map((product) => {
                const matchingProduct = products.find(
                    (newProduct) => newProduct.product.toString() === product.product.toString() &&
                                   newProduct.stock.toString() === product.stock.toString()
                );

                if (matchingProduct) {
                    const adjustedQuantity = Number(product.quantity) - Number(matchingProduct.quantity);
                    if (adjustedQuantity <= 0 || adjustedQuantity === Number(product.quantity)) {
                        return null; // Skip if no change or quantity is invalid
                    }
                    return { 
                        ...product, 
                        quantity: adjustedQuantity,
                        price: product.price
                    };
                }
                return product;
            })
            .filter(Boolean); // Remove null values

        // Check if there are any changes
        if (updatedProducts.length === 0) {
            return next(new CustomError('No changes were made to the receipt status', 400));
        }

        // Create a new ReceiptStatus
        const [newReceiptStatus] = await ReceiptStatus.create([{
            receipt: existingReceipt._id,
            products: updatedProducts,
            date: currentDateTime
        }], { session });

        if (!newReceiptStatus) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Error while creating new receipt status, try again.', 400));
        }

        // Update receipt total and profit
        const newTotal = updatedProducts.reduce((acc, product) => acc + (Number(product.price) * Number(product.quantity)), 0);
        const newProfit = (newTotal * Number(existingReceipt.profit)) / Number(existingReceipt.total);
        
        existingReceipt.total = newTotal;
        existingReceipt.profit = newProfit;
        existingReceipt.products.push(newReceiptStatus._id);

        // Update receipt payment list if necessary
        const currentPaymentsTotal = existingReceipt.payment.reduce((acc, payment) => acc + payment.amount, 0);
        if (currentPaymentsTotal > newTotal) {
            let remainingAmount = currentPaymentsTotal - newTotal;
            existingReceipt.payment = existingReceipt.payment.map((payment) => {
                if (remainingAmount > 0) {
                    if (payment.amount > remainingAmount) {
                        payment.amount -= remainingAmount;
                        remainingAmount = 0;
                    } else {
                        remainingAmount -= payment.amount;
                        payment.amount = 0;
                    }
                }
                return payment;
            });
        }

        // Save the updated receipt
        await existingReceipt.save({ session });

        // Update stock quantities
        const stockUpdates = products.map(async (product) => {
            const existingStock = await Stock.findById(product.stock).session(session);
            if (existingStock && product.quantity > 0) {
                existingStock.quantity += Number(product.quantity);
                await existingStock.save({ session });
            }
        });
        await Promise.all(stockUpdates); // Process stock updates in parallel

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        // Return success response
        res.status(200).json({ message: 'New receipt status added successfully' });
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error(err);
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