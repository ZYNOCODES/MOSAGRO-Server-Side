const mongoose = require('mongoose');
const validator = require('validator');
const Receipt = require('../model/ReceiptModel.js');
const ReceiptStatus = require('../model/ReceiptStatusModel.js');
const Stock = require('../model/StockModel');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const { findUserById } = require('../service/UserService.js');
const { findStoreById } = require('../service/StoreService.js');
const { findReceiptById, findNoneDeliveredReceiptByStore, findCreditedReceipt, findReceiptByIdAndClient , findReceiptByIdAndStore} = require('../service/ReceiptService.js');
const { checkUserStore } = require('../service/MyStoreService.js');
const ReceiptService = require('../service/ReceiptService.js');
const NotificationService = require('../service/NotificationService.js');
const moment = require('../util/Moment.js');

//create a receipt
const CreateReceipt = asyncErrorHandler(async (req, res, next) => {
    const { store, client } = req.params;
    const { products, total, deliveredLocation, type, deliveredAmount } = req.body;
    const currentDateTime = moment.getCurrentDateTime(); // Ensures UTC+1

    // Validate required fields
    if (!products || !Array.isArray(products) || products.length === 0) {
        return next(new CustomError('You have to pick at least one product', 400));
    }
    if (!total || !validator.isNumeric(total.toString())) {
        return next(new CustomError('Total is required and must be a valid number', 400));
    }
    if (!type) {
        return next(new CustomError('Order type is required. You must select one.', 400));
    }
    if (type === 'delivery' && !deliveredLocation) {
        return next(new CustomError('Delivery address is required', 400));
    }

    // Validate product fields
    const invalidProduct = products.some(product => (
        !mongoose.Types.ObjectId.isValid(product.stock) ||
        !product.quantity || product.quantity <= 0 || !validator.isNumeric(product.quantity.toString()) ||
        !product.price || product.price <= 0 || !validator.isNumeric(product.price.toString())
    ));
    if (invalidProduct) {
        return next(new CustomError('All products must have a valid quantity and price', 400));
    }

    // Validate total matches the sum of product prices
    const sum = products.reduce((acc, product) => acc + product.price * product.quantity, 0);
    if (sum !== Number(total)) {
        return next(new CustomError('Total does not match the sum of all product prices', 400));
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        let totalProfit = 0;

        // Validate and update stock quantities
        for (const product of products) {
            const existingStock = await Stock.findOne({
                _id: product.stock,
                store: store
            }).populate('product', 'name').session(session);

            if (!existingStock) {
                await session.abortTransaction();
                session.endSession();
                return next(new CustomError(`Product not found. Clear all products and try again.`, 404));
            }

            // Validate stock quantity
            if (existingStock.quantity < product.quantity) {
                await session.abortTransaction();
                session.endSession();
                return next(new CustomError(
                    `The quantity ${product.quantity} of ${existingStock.product.name} is not available. You can buy only ${existingStock.quantity}.`,
                    400
                ));
            }

            // Validate selling price
            if (Number(existingStock.selling) !== Number(product.price)) {
                await session.abortTransaction();
                session.endSession();
                return next(new CustomError(
                    `The price ${product.price} of ${existingStock.product.name} is not valid.`,
                    400
                ));
            }

            // Validate quantity limit
            if (existingStock.quantityLimit > 0 && existingStock.quantityLimit < product.quantity) {
                await session.abortTransaction();
                session.endSession();
                return next(new CustomError(
                    `The quantity ${product.quantity} of ${existingStock.product.name} is limited to ${existingStock.quantityLimit} items maximum.`,
                    400
                ));
            }

            // Update stock quantity
            existingStock.quantity -= product.quantity;
            await existingStock.save({ session });

            // Calculate profit
            totalProfit += (product.price - existingStock.buying) * product.quantity;

            // Add product ID to the product object
            product.product = existingStock.product;
        }

        // Validate total profit
        if (totalProfit < 0) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Total profit cannot be negative', 405));
        }

        // Create a new receipt status
        const [newReceiptStatus] = await ReceiptStatus.create([{
            products: products,
            date: currentDateTime
        }], { session });

        if (!newReceiptStatus) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Error while creating new receipt status. Try again.', 400));
        }

        // Create a new receipt
        const [newReceipt] = await Receipt.create([{
            store: store,
            client: client,
            products: [newReceiptStatus._id],
            total: total,
            profit: totalProfit,
            date: currentDateTime,
            type: type,
            deliveredLocation: type === 'delivery' ? deliveredLocation : null,
            delivered: false,
            status: 0
        }], { session });

        if (!newReceipt) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Error while creating new receipt. Try again.', 400));
        }

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        // Return success response
        res.status(200).json({
            message: 'The order is submitted successfully',
            OrderID: newReceipt._id
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Error creating receipt:', error);
        return next(new CustomError('Error while creating new receipt. Try again.', 500));
    }
});
//create a receipt
const CreateReceiptFromStore = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    const { client, products, total, deliveredLocation, type, deliveredAmount, deliveredExpectedDate } = req.body;
    //get current date with algeire timezome
    const currentDateTime = moment.getCurrentDateTime(); // Ensures UTC+1

    // Check if all fields are provided
    if (!products || !total || !client || !type ||
        !mongoose.Types.ObjectId.isValid(client) ||
        !Array.isArray(products) || !validator.isNumeric(total.toString())
    ) {
        return next(new CustomError('All fields are required', 400));
    }
    if (type === 'delivery' && (
        !deliveredLocation || !deliveredAmount || !deliveredExpectedDate
    )
    ) {
        return next(new CustomError('Delivered location, amount and expected date are required', 400));
    }
    if (products.length <= 0) {
        return next(new CustomError('You have to pick at least one product', 400));
    }

    // Check if all products have a quantity and price
    if (products.some(val => {
        return (!mongoose.Types.ObjectId.isValid(val.stock)) && 
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
            return next(new CustomError('Client not found', 404));
        }

        //check if client is a client for the store
        const isClient = await checkUserStore(client, store, session);
        if (!isClient) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('You are not a client for this store', 405));
        }
        //calculate total profit
        var totalProfit = 0;
        //check if the all products exist
        for (const item of products) {
            const existingStock = await Stock.findOne({
                _id: item.stock,
                store: store
            }).populate({
                path: 'product',
                select: 'name'
            }).session(session);
            if (!existingStock) {
                await session.abortTransaction();
                session.endSession();
                return next(new CustomError(`Product not found, clear all products and try again.`, 404));
            }
            //check if the product quantity is enough
            if (existingStock.quantity < item.quantity) {
                await session.abortTransaction();
                session.endSession();
                return next(
                    new CustomError(
                    `This quantity ${item.quantity} of ${existingStock.product.name} is no availble`,
                    400)
                );
            }
            //check if all price is equal to the selling price and threre is no manipulation
            if (Number(existingStock.selling) != Number(item.price)) {
                await session.abortTransaction();
                session.endSession();
                return next(new CustomError(`This price ${item.price} of ${existingStock.product.name} is not valid`,400));
            }
            //check if Quantity limitation
            if (existingStock.quantityLimit > 0 &&
                existingStock.quantityLimit < item.quantity) {
                await session.abortTransaction();
                session.endSession();
                return next(
                    new CustomError(
                    `This quantity ${item.quantity} of ${existingStock.product.name} is limited to ${existingStock.quantityLimit} items maximum`,
                    400)
                );
            }
            //update stock quantity
            existingStock.quantity -= item.quantity;
            await existingStock.save({ session });
            
            //calculate profit
            totalProfit += (
                item.price - existingStock.buying
            ) * item.quantity;
            //add product id to the product object
            item.product = existingStock.product;
        }
        // Check if the total profit is not negative
        if (totalProfit < 0) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Total profit cannot be negative', 405));
        }

        // Create a new receipt status
        const newReceiptStatus = await ReceiptStatus.create([
            {
                products: products,
                date: currentDateTime
            }
        ], { session });
        //check if new status was created
        if (!newReceiptStatus || !newReceiptStatus[0]) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Error while creating new receipt status, try again.', 400));
        }
        // Create a new receipt
        const newReceipt = await Receipt.create([{
            store: store,
            client: client,
            products: [newReceiptStatus[0]._id],
            total: Number(total) + Number(deliveredAmount),
            profit: totalProfit,
            date: currentDateTime,
            type: type,
            deliveredLocation: type != 'delivery' ? null : deliveredLocation,
            expextedDeliveryDate: type != 'delivery' ? null : deliveredExpectedDate,
            delivered: false,
            status: 0
        }], { session });        
        if(!newReceipt || !newReceipt[0]){
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Error while creating new receipt, try again', 400));
        }

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: 'The order is submitted successfully', id: newReceipt[0]._id});
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.log(error)
        return next(new CustomError('Error while creating new receipt, try again', 500));
    }
});
//get specific Receipt
const GetReceiptByID = asyncErrorHandler(async (req, res, next) => {
    const { id, store } = req.params;
    //check all required fields
    if( !id || !mongoose.Types.ObjectId.isValid(id)){
        return next(new CustomError('All fields are required', 400));
    }
    const existingreceipt = await Receipt.findOne({
        _id: id,
        store
    }).populate({
        path: 'client',
        select: 'firstName lastName phoneNumber email wilaya commune'
    });
    if(!existingreceipt){
        return next(new CustomError('Receipt not found', 404));
    }
    res.status(200).json(existingreceipt);
});
//get specific Receipt for client
const GetReceiptByIDForClient = asyncErrorHandler(async (req, res, next) => {
    const { receipt } = req.params;
    //check all required fields
    if( !receipt || !mongoose.Types.ObjectId.isValid(receipt)){
        return next(new CustomError('All fields are required', 400));
    }
    const existingreceipt = await Receipt.findById({
        _id: receipt
    }).populate({
        path: 'store',
        select: 'storeName'
    });
    //check existingreceipt
    if(!existingreceipt){
        return next(new CustomError('Receipt not found', 404));
    }
    //fetch last receipt status
    const lastReceiptStatus = existingreceipt.products[existingreceipt.products.length - 1];
            
    // Find the last receipt status
    const lastReceiptStatusData = await ReceiptStatus.findOne({
        _id: lastReceiptStatus
    }).populate({
        path: 'products.product',
        select: 'name size brand boxItems image',
        populate:{
            path: 'brand',
            select: 'name'
        }
    });

    if (!lastReceiptStatusData) {
        return next(new CustomError('Receipt status not found', 404));
    }

    //the return object combinision
    const returnObject = {
        reciept: existingreceipt.toObject(),
        recieptStatus: lastReceiptStatusData.toObject()
    }
    res.status(200).json(returnObject);
});
//get all none delivered receipts by store
const GetAllLatestReceiptsByStore = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    const receipts = await Receipt.find({
        store: store,
        status: 0,
        credit: false,
        deposit: false,
        delivered: false
    }).populate({
        path: 'client',
        select: 'firstName lastName phoneNumber'
    });

    if(receipts.length <= 0){
        const err = new CustomError('No receipts found for you', 400);
        return next(err);
    }

    // For each receipt, fetch the last receipt status
    for (let i = 0; i < receipts.length; i++) {
        let receipt = receipts[i];  // Access receipt using index

        if (receipt.products && receipt.products.length > 0) {
            const lastProductId = receipt.products[receipt.products.length - 1];  // Get last product ID
            
            // Find the last product's receipt status
            const lastReceiptStatus = await ReceiptStatus.findOne({
                _id: lastProductId
            }).populate({
                path: 'products.product',
                select: 'name size brand boxItems',
                populate:{
                    path: 'brand',
                    select: 'name'
                }
            });
            
            if (!lastReceiptStatus) {
                return next(new CustomError('Receipt status not found', 404));
            }

            // Create an updated receipt with ordersList and replace the original receipt
            receipts[i] = {
                ...receipt.toObject(),  // Copy the original receipt's properties
                products: lastReceiptStatus.products  // Attach the ordersList
            };
        } else {
            const err = new CustomError('No products found for this receipt', 400);
            return next(err);
        }
    }

    res.status(200).json(receipts);
});
//get all in pregress receipts by store
const GetAllNonedeliveredReceiptsByStore = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    const receipts = await Receipt.find({
        store: store,
        status: { 
            $nin: [-2, -1, 0, 4, 10]
        },
        credit: false,
        deposit: false,
        delivered: false
    }).populate({
        path: 'client',
        select: 'firstName lastName phoneNumber'
    });

    if(receipts.length <= 0){
        const err = new CustomError('No receipts found for you', 400);
        return next(err);
    }

    // For each receipt, fetch the last receipt status
    for (let i = 0; i < receipts.length; i++) {
        let receipt = receipts[i];  // Access receipt using index

        if (receipt.products && receipt.products.length > 0) {
            const lastProductId = receipt.products[receipt.products.length - 1];  // Get last product ID
            
            // Find the last product's receipt status
            const lastReceiptStatus = await ReceiptStatus.findOne({
                _id: lastProductId
            }).populate({
                path: 'products.product',
                select: 'name size brand boxItems',
                populate:{
                    path: 'brand',
                    select: 'name'
                }
            });
            
            if (!lastReceiptStatus) {
                return next(new CustomError('Receipt status not found', 404));
            }

            // Create an updated receipt with ordersList and replace the original receipt
            receipts[i] = {
                ...receipt.toObject(),  // Copy the original receipt's properties
                products: lastReceiptStatus.products  // Attach the ordersList
            };
        } else {
            const err = new CustomError('No products found for this receipt', 400);
            return next(err);
        }
    }

    res.status(200).json(receipts);
});
//get all delivered receipts by store
const GetAlldeliveredReceiptsByStore = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    const receipts = await Receipt.find({
        store: store,
        delivered: true,
        status: {
            $in: [-2, -1, 10]
        }
    }).populate({
        path: 'client',
        select: 'firstName lastName phoneNumber'
    });
    if(receipts.length <= 0){
        const err = new CustomError('No delivered receipts found for you', 400);
        return next(err);
    }

    // For each receipt, fetch the last receipt status
    for (let i = 0; i < receipts.length; i++) {
        let receipt = receipts[i];  // Access receipt using index

        if (receipt.products && receipt.products.length > 0) {
            const lastProductId = receipt.products[receipt.products.length - 1];  // Get last product ID
            
            // Find the last product's receipt status
            const lastReceiptStatus = await ReceiptStatus.findOne({
                _id: lastProductId
            }).populate({
                path: 'products.product',
                select: 'name size brand boxItems',
                populate:{
                    path: 'brand',
                    select: 'name'
                }
            });
            
            if (!lastReceiptStatus) {
                return next(new CustomError('Receipt status not found', 404));
            }

            // Create an updated receipt with ordersList and replace the original receipt
            receipts[i] = {
                ...receipt.toObject(),  // Copy the original receipt's properties
                products: lastReceiptStatus.products  // Attach the ordersList
            };
        } else {
            const err = new CustomError('No products found for this receipt', 400);
            return next(err);
        }
    }

    res.status(200).json(receipts);
});
//get all delivered receipts by store which are credited by the client
const GetAlldeliveredReceiptsByStoreCredited = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    const receipts = await Receipt.find({
        store: store,
        $or: [
            { credit: true },
            { deposit: true }
        ]
    }).populate({
        path: 'client',
        select: 'firstName lastName phoneNumber'
    }).populate({
        path: 'products.product',
        select: 'name size'
    });
    if(receipts.length <= 0){
        const err = new CustomError('No credited delivered receipts found for you', 400);
        return next(err);
    }

    // For each receipt, fetch the last receipt status
    for (let i = 0; i < receipts.length; i++) {
        let receipt = receipts[i];  // Access receipt using index

        if (receipt.products && receipt.products.length > 0) {
            const lastProductId = receipt.products[receipt.products.length - 1];  // Get last product ID
            
            // Find the last product's receipt status
            const lastReceiptStatus = await ReceiptStatus.findOne({
                _id: lastProductId
            }).populate({
                path: 'products.product',
                select: 'name size brand boxItems',
                populate:{
                    path: 'brand',
                    select: 'name'
                }
            });
            
            if (!lastReceiptStatus) {
                return next(new CustomError('Receipt status not found', 404));
            }

            // Create an updated receipt with ordersList and replace the original receipt
            receipts[i] = {
                ...receipt.toObject(),  // Copy the original receipt's properties
                products: lastReceiptStatus.products  // Attach the ordersList
            };
        } else {
            const err = new CustomError('No products found for this receipt', 400);
            return next(err);
        }
    }

    res.status(200).json(receipts);
});
//fetch all returned receipts by store
const GetAllReturnedReceiptsByStore = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    const receipts = await Receipt.find({
        store: store,
        status: 4,
        delivered: true
    }).populate({
        path: 'client',
        select: 'firstName lastName phoneNumber'
    }).populate({
        path: 'products.product',
        select: 'name size'
    });
    if(receipts.length <= 0){
        const err = new CustomError('No returned receipts found for you', 400);
        return next(err);
    }

    // For each receipt, fetch the last receipt status
    for (let i = 0; i < receipts.length; i++) {
        let receipt = receipts[i];  // Access receipt using index

        if (receipt.products && receipt.products.length > 0) {
            const lastProductId = receipt.products[receipt.products.length - 1];  // Get last product ID
            
            // Find the last product's receipt status
            const lastReceiptStatus = await ReceiptStatus.findOne({
                _id: lastProductId
            }).populate({
                path: 'products.product',
                select: 'name size brand boxItems',
                populate:{
                    path: 'brand',
                    select: 'name'
                }
            });
            
            if (!lastReceiptStatus) {
                return next(new CustomError('Receipt status not found', 404));
            }

            // Create an updated receipt with ordersList and replace the original receipt
            receipts[i] = {
                ...receipt.toObject(),  // Copy the original receipt's properties
                products: lastReceiptStatus.products  // Attach the ordersList
            };
        } else {
            const err = new CustomError('No products found for this receipt', 400);
            return next(err);
        }
    }

    res.status(200).json(receipts);
});
//get all receipts by client
const GetAllReceiptsByClient = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const receipts = await Receipt.find({
        client: id,
        status: { 
            $nin: [-2, -1, 10]
        },
        delivered: false
    }).populate({
        path: 'store',
        select: 'storeName phoneNumber storeAddress storeLocation',
    });
    if(receipts.length <= 0){
        const err = new CustomError('No receipts found for you', 400);
        return next(err);
    }

    // For each receipt, fetch the last receipt status
    for (let i = 0; i < receipts.length; i++) {
        let receipt = receipts[i];  // Access receipt using index

        if (receipt.products && receipt.products.length > 0) {
            const lastProductId = receipt.products[receipt.products.length - 1];  // Get last product ID
            
            // Find the last product's receipt status
            const lastReceiptStatus = await ReceiptStatus.findOne({
                _id: lastProductId
            }).populate({
                path: 'products.product',
                select: 'name size brand boxItems',
                populate:{
                    path: 'brand',
                    select: 'name'
                }
            });
            
            if (!lastReceiptStatus) {
                return next(new CustomError('Receipt status not found', 404));
            }

            // Create an updated receipt with ordersList and replace the original receipt
            receipts[i] = {
                ...receipt.toObject(),  // Copy the original receipt's properties
                products: lastReceiptStatus.products  // Attach the ordersList
            };
        } else {
            const err = new CustomError('No products found for this receipt', 400);
            return next(err);
        }
    }

    res.status(200).json(receipts);
});
//get all archive receipts by client
const GetAllArchiveReceiptsByClient = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const receipts = await Receipt.find({
        client: id,
        delivered: true,
    }).populate({
        path: 'store',
        select: 'storeName phoneNumber storeAddress storeLocation',
    });
    if(receipts.length <= 0){
        const err = new CustomError('No receipts found for you', 400);
        return next(err);
    }

    // For each receipt, fetch the last receipt status
    for (let i = 0; i < receipts.length; i++) {
        let receipt = receipts[i];  // Access receipt using index

        if (receipt.products && receipt.products.length > 0) {
            const lastProductId = receipt.products[receipt.products.length - 1];  // Get last product ID
            
            // Find the last product's receipt status
            const lastReceiptStatus = await ReceiptStatus.findOne({
                _id: lastProductId
            }).populate({
                path: 'products.product',
                select: 'name size brand boxItems',
                populate:{
                    path: 'brand',
                    select: 'name'
                }
            });
            
            if (!lastReceiptStatus) {
                return next(new CustomError('Receipt status not found', 404));
            }

            // Create an updated receipt with ordersList and replace the original receipt
            receipts[i] = {
                ...receipt.toObject(),  // Copy the original receipt's properties
                products: lastReceiptStatus.products  // Attach the ordersList
            };
        } else {
            const err = new CustomError('No products found for this receipt', 400);
            return next(err);
        }
    }
    res.status(200).json(receipts);
});
//get all receipts by client for a specific store
const GetAllReceiptsByClientForStore = asyncErrorHandler(async (req, res, next) => {
    const { client, store } = req.params;

    // Validate the required fields
    if (!client || 
        !mongoose.Types.ObjectId.isValid(client)) {
        return next(new CustomError('All fields are required', 400));
    }

    // Check if the client exists
    const existingClient = await findUserById(client);
    if (!existingClient) {
        return next(new CustomError('Client not found', 404));
    }

    // Fetch all receipts for the client in the specified store
    const receipts = await Receipt.find({
        client: client,
        store: store,
    });

    // Check if any receipts were found
    if (receipts.length <= 0) {
        const err = new CustomError('No receipts found for this client', 400);
        return next(err);
    }

    // For each receipt, fetch the last receipt status
    for (let i = 0; i < receipts.length; i++) {
        let receipt = receipts[i];  // Access receipt using index

        if (receipt.products && receipt.products.length > 0) {
            const lastProductId = receipt.products[receipt.products.length - 1];  // Get last product ID
            
            // Find the last product's receipt status
            const lastReceiptStatus = await ReceiptStatus.findOne({
                _id: lastProductId
            }).populate({
                path: 'products.product',
                select: 'name size brand boxItems',
                populate:{
                    path: 'brand',
                    select: 'name'
                }
            });
            
            if (!lastReceiptStatus) {
                return next(new CustomError('Receipt status not found', 404));
            }

            // Create an updated receipt with ordersList and replace the original receipt
            receipts[i] = {
                ...receipt.toObject(),  // Copy the original receipt's properties
                products: lastReceiptStatus.products  // Attach the ordersList
            };
        } else {
            const err = new CustomError('No products found for this receipt', 400);
            return next(err);
        }
    }

    // Send the response with all data in the same object
    res.status(200).json(receipts);
});
//validate delivered
const ValidateMyReceipt = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { reciept, status } = req.body;
    //check id 
    if( !reciept || !mongoose.Types.ObjectId.isValid(reciept) || !status ){
        return next(new CustomError('All fields are required', 400));
    }
    //check if status is valid [3 or 4]
    if([3, 4].includes(status)){
        return next(new CustomError('Status is not valid', 400));
    }
    
    //check if receipt exist
    const existingreceipt = await findReceiptByIdAndClient(reciept, id);
    if(!existingreceipt){
        return next(new CustomError('Receipt not found', 404));
    }
    //check if the receipt is already delivered
    if(existingreceipt.delivered){
        return next(new CustomError('This receipt is already delivered', 400));
    }
    //update 
    const updatedreceipt = await Receipt.updateOne({ _id: reciept }, { 
        delivered: true,
        status: status,
        expextedDeliveryDate: moment.getCurrentDateTime()
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
    const { id, store } = req.params;
    const { date } = req.body;
    //check the fields
    if( !id || !date 
        || !mongoose.Types.ObjectId.isValid(id)){
        return next(new CustomError('All fields are required', 400));
    }
    //check if receipt exist
    const existingreceipt = await findReceiptByIdAndStore(id, store);
    if(!existingreceipt){
        return next(new CustomError('Receipt not found', 404));
    }
    existingreceipt.expextedDeliveryDate = date;
    //update 
    const updatedreceipt = await existingreceipt.save();
    // Check if receipt updated successfully
    if (!updatedreceipt) {
        const err = new CustomError('Error while updating receipt, try again.', 400);
        return next(err);
    }
    res.status(200).json({ message: 'The expexted delivery date was submited successfully' });
});
//update specific product price in a receipt
const UpdateReceiptProductPrice = asyncErrorHandler(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { store } = req.params;
        const { id, stock, price } = req.body;

        // Validate the input fields
        if (!id || !stock || !price ||
            !mongoose.Types.ObjectId.isValid(id) ||
            !mongoose.Types.ObjectId.isValid(stock) ||
            !validator.isNumeric(price.toString())) {
            return next(new CustomError('All fields are required', 400));
        }

        // Check if the receipt exists
        const existingReceipt = await findNoneDeliveredReceiptByStore(store, id, session);
        if (!existingReceipt) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Receipt not found', 404));
        }

        // Check if the stock exists in the receipt
        const stockIndex = existingReceipt.products.findIndex(val => val.stock.toString() === stock);
        if (stockIndex === -1) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Product not found in the receipt', 404));
        }

        // Update the product price in the receipt
        existingReceipt.products[stockIndex].price = price;

        // Update receipt total
        existingReceipt.total = existingReceipt.products.reduce((acc, product) => acc + product.price * product.quantity, 0);

        // Update receipt profit
        let totalProfit = 0;
        for (let product of existingReceipt.products) {
            const existingProduct = await Stock.findOne({ _id: product.stock }).session(session);
            if (existingProduct) {
                totalProfit += (product.price - existingProduct.buying) * product.quantity;
            }
        }
        existingReceipt.profit = totalProfit;

        // Save the updated receipt
        const updatedReceipt = await existingReceipt.save({ session });

        // Check if receipt updated successfully
        if (!updatedReceipt) {
            throw new CustomError('Error while updating receipt, try again.', 400);
        }

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: 'The product price was submitted successfully' });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return next(error);
    }
});
//add payment to credit receipt
const AddPaymentToReceipt = asyncErrorHandler(async (req, res, next) => {
    const { id, store } = req.params;
    const { amount } = req.body;
    // Validate ID
    if(!id || !mongoose.Types.ObjectId.isValid(id)){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    // Check if the amount is valid
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
        const err = new CustomError('Enter a valid positive amount', 400);
        return next(err);
    }

    //check if receipt exist
    const existingReceipt = await Receipt.findOne({
        _id: id,
        store: store,
    });
    if(!existingReceipt){
        return next(new CustomError('Receipt not found', 404));
    }

    //check if the receipt is status between 0, 1, 2
    if([0, 1].includes(existingReceipt.status)){
        const err =new CustomError(`This receipt is not ready for payment check the order status`, 400);
        return next(err);
    }

    //check if already closed
    if(existingReceipt.status == 10){
        const err =new CustomError(`This receipt is already fully paid`, 400);
        return next(err);
    }

    //check if the receipt is credited
    if (existingReceipt.credit == false) {
        const err = new CustomError('You can\'t add payment because this receipt is not credited', 400);
        return next(err);
    }

    // Calculate the sum of existing payments
    const totalPaid = existingReceipt.payment.reduce((acc, val) => acc + val.amount, 0);

    // Validate payment against the total
    if ((totalPaid + parseFloat(amount)) > existingReceipt.total) {
        const err =new CustomError(`The sum of payments is greater than the total. The remaining amount to pay is ${existingReceipt.total - totalPaid}`, 400);
        return next(err);
    }

    //check if this receipt is credited or not
    if(existingReceipt.credit == false){
        // Validate payment against the total
        if ((parseFloat(amount)) != parseFloat(existingReceipt.total)) {
            const err =new CustomError(`The payment must be equal to the total price. The remaining amount to pay is ${existingReceipt.total}`, 400);
            return next(err);
        }
        existingReceipt.status = 10
        existingReceipt.credit = false;
    }

    // Add new payment
    existingReceipt.payment.push({
        amount: parseFloat(amount),
        date: moment.getCurrentDateTime() // Ensures UTC+1
    });

    // Check if the receipt is fully paid
    if ((totalPaid + parseFloat(amount)) == existingReceipt.total && existingReceipt.credit == true) {
        existingReceipt.status = 10
        existingReceipt.credit = false;
    }

    // Save updated receipt
    const updatedReceipt = await existingReceipt.save();
    if (!updatedReceipt) {
        const err = new CustomError('Error while adding payment to receipt, try again', 400);
        return next(err);
    }
    // Return the response
    res.status(200).json({ message: 'The payment was submited successfully' });
});
//add payments tp Receipt
const AddFullPaymentToReceipt = asyncErrorHandler(async (req, res, next) => {
    const { id, store } = req.params;
    
    // Get current date with Algiers timezone
    const currentDateTime = moment.getCurrentDateTime(); // Ensures UTC+1

    // Validate ID
    if(!id || !mongoose.Types.ObjectId.isValid(id)){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }

    //check if receipt exist
    const existingReceipt = await Receipt.findOne({
        _id: id,
        store: store,
    });
    if(!existingReceipt){
        return next(new CustomError('Receipt not found', 404));
    }
    //check if the receipt is status between 0, 1, 2
    if([0, 1].includes(existingReceipt.status)){
        const err =new CustomError(`This receipt is not ready for full payment check the order status`, 400);
        return next(err);
    }
    //check if already closed
    if(existingReceipt.status == 10){
        const err =new CustomError(`This receipt is already fully paid`, 400);
        return next(err);
    }
    //check if already cancelled
    if(existingReceipt.status == -2 || existingReceipt.status == -1){
        const err =new CustomError(`This receipt is already cancelled`, 400);
        return next(err);
    }

    //check if the receipt is credited
    if (existingReceipt.credit == true) {
        const err = new CustomError('You can\'t add full payment because this receipt is credited', 400);
        return next(err);
    }

    // Clear the payment array first
    existingReceipt.payment = [];
    // Add the payment to the Receipt
    existingReceipt.payment.push({
        date: currentDateTime,
        amount: Number(existingReceipt.total)
    });
    existingReceipt.status = 10;

    // Save the updated Receipt
    const updatedReceipt = await existingReceipt.save();

    // Check if the Receipt was updated successfully
    if (!updatedReceipt) {
        const err = new CustomError('Error while adding full payment, try again.', 400);
        return next(err);
    }

    res.status(200).json({ message: 'Full payment added successfully' });
});
//make reciept status
const updateReceiptStatus = asyncErrorHandler(async (req, res, next) => {
    const { status, id } = req.body;

    // Validate ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }

    // Validate status
    if (isNaN(status) || Number(status) < 0 ||
        !validator.isIn(status.toString(), ['0', '1', '2'])
    ) {
        const err = new CustomError('Enter a valid status', 400);
        return next(err);
    }

    // Start a session and transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Check if receipt exists
        const existingReceipt = await Receipt.findById(id).populate({
            path: 'store',
            select: 'storeName'
        }).session(session);
        if (!existingReceipt) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Receipt not found', 404));
        }

        // Check if receipt is already closed
        if (existingReceipt.status == 10) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('This receipt is already fully paid', 400));
        }
        // Check if receipt is already canceled
        if (existingReceipt.status == -2 || existingReceipt.status == -1) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('This receipt is already canceled', 400));
        }
        // Check if receipt is already delivered
        if (existingReceipt.delivered) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('This receipt is already delivered', 400));
        }
        // Check if receipt is already have same status
        if (existingReceipt.status == status) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('This receipt is already have the same status', 400));
        }

        // Update receipt status
        existingReceipt.status = status;
        const updatedReceipt = await existingReceipt.save({ session });

        // Check if receipt was updated successfully
        if (!updatedReceipt) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Error while updating receipt, try again.', 400));
        }

        // Check if a notification needs to be created
        const orderDelivered = status == 2 && existingReceipt.type == 'delivery';
        const orderReady = status == 2 && existingReceipt.type == 'pickup';
        if (orderDelivered || orderReady) {
            // message to send 
            const msg = orderReady == 'order_ready' ?
                    `Your order from ${existingReceipt.store.storeName} is ready for pickup`
                    :
                    `Your order from ${existingReceipt.store.storeName} has been delivered and is on its way to you`
            // Create new notification
            const newNotification = await NotificationService.createNewNotificationForClient(
                existingReceipt.client,
                orderDelivered ? 'order_delivered' : 'order_ready',
                msg,
                session
            );

            if (!newNotification || !newNotification[0]) {
                await session.abortTransaction();
                session.endSession();
                return next(new CustomError('Error while creating new notification, try again', 400));
            }
        }

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        // Return the response
        res.status(200).json({ message: 'The status was updated successfully' });
    } catch (error) {
        // Abort the transaction on error
        await session.abortTransaction();
        session.endSession();
        console.error('Error updating receipt status:', error);
        // Handle other errors
        return next(new CustomError('An error occurred while updating the receipt status.', 500));
    }
});
//Update Receipt credit
const UpdateReceiptCredited = asyncErrorHandler(async (req, res, next) => {
    const { id, store } = req.params;
    const { credited } = req.body;
    if(!id || !mongoose.Types.ObjectId.isValid(id)
    ){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    if(!validator.isBoolean(credited.toString())){
        const err = new CustomError('Enter a valid value', 400);
        return next(err);
    }

    //check if receipt exist
    const existingReceipt = await Receipt.findOne({
        _id: id,
        store: store
    });
    if(!existingReceipt){
        return next(new CustomError('Receipt not found', 404));
    }

    //check if already closed
    if(existingReceipt.status == 10){
        const err =new CustomError(`This receipt is already fully paid`, 400);
        return next(err);
    }

    //check if reciept is a returned receipt
    if(existingReceipt.status == 9){
        const err =new CustomError(`This receipt is a returned receipt, you can't make it credited`, 400);
        return next(err);
    }

    //check if already cancelled
    if(existingReceipt.status == -2 || existingReceipt.status == -1){
        const err =new CustomError(`This receipt is already cancelled`, 400);
        return next(err);
    }
    
    //check if already deposit
    if(existingReceipt.deposit == true){
        const err =new CustomError(`You can't make it credited because it's already a deposit receipt`, 400);
        return next(err);
    }

    // Save updated receipt
    if(credited === false){
        // Clear the payment array first
        existingReceipt.payment = [];
        existingReceipt.credit = false;
    }
    existingReceipt.credit = credited;

    const updatedReceipt = await existingReceipt.save();
    if (!updatedReceipt) {
        const err = new CustomError('Error while updating credit to receipt, try again', 400);
        return next(err);
    }
    // Return the response
    res.status(200).json({ message: `Receipt now is ${credited ? "" : "not "}credited` });
});
//Update Receipt deposit
const UpdateReceiptDiposit = asyncErrorHandler(async (req, res, next) => {
    const { id, store } = req.params;
    const { deposit } = req.body;
    if(!id || !mongoose.Types.ObjectId.isValid(id)){
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }
    if(!validator.isBoolean(deposit.toString())){
        const err = new CustomError('Enter a valid value', 400);
        return next(err);
    }

    //check if receipt exist
    const existingReceipt = await Receipt.findOne({
        _id: id,
        store: store
    });
    if(!existingReceipt){
        return next(new CustomError('Receipt not found', 404));
    }

    //check if already closed
    if(existingReceipt.status == 10){
        const err =new CustomError(`This receipt is already fully paid`, 400);
        return next(err);
    }

    //check if reciept is a returned receipt
    if(existingReceipt.status == 9){
        const err =new CustomError(`This receipt is a returned receipt, you can't make it deposit`, 400);
        return next(err);
    }

    //check if already cancelled
    if(existingReceipt.status == -2 || existingReceipt.status == -1){
        const err =new CustomError(`This receipt is already cancelled`, 400);
        return next(err);
    }

    //check if already credited
    if(existingReceipt.credit == true){
        const err =new CustomError(`You can't make it deposit because it's already a credited receipt`, 400);
        return next(err);
    }

    // Save updated receipt
    if(deposit === false){
        existingReceipt.deposit = deposit;
    }
    existingReceipt.deposit = deposit;

    const updatedReceipt = await existingReceipt.save();
    if (!updatedReceipt) {
        const err = new CustomError('Error while updating deposit receipt, try again', 400);
        return next(err);
    }
    // Return the response
    res.status(200).json({ message: `Receipt now is ${deposit ? "" : "not "}deposit` });
});
//cancel receipt by store
const CancelReceiptByStore = asyncErrorHandler(async (req, res, next) => {
    const { store, id } = req.params;
    // Validate ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }

    // Check if the receipt exists
    const existingReceipt = await findReceiptByIdAndStore(id, store);
    if (!existingReceipt) {
        return next(new CustomError('Receipt not found', 404));
    }

    // Check if the receipt is already closed
    if (existingReceipt.status != 0 || existingReceipt.credit || existingReceipt.deposit || existingReceipt.delivered) {
        return next(new CustomError('You can only cancel new placed orders', 400));
    }

    // Update the receipt status
    existingReceipt.status = -2;
    existingReceipt.delivered = true;
    const updatedReceipt = await existingReceipt.save();
    if (!updatedReceipt) {
        return next(new CustomError('Error while cancelling receipt, try again', 400));
    }

    // Return the response
    res.status(200).json({ message: 'The receipt was cancelled successfully' });
});
//cancel receipt by client
const CancelReceiptByClient = asyncErrorHandler(async (req, res, next) => {
    const { receipt, id } = req.params;
    // Validate ID
    if (!receipt || !mongoose.Types.ObjectId.isValid(receipt)) {
        const err = new CustomError('All fields are required', 400);
        return next(err);
    }

    // Check if the receipt exists
    const existingReceipt = await findReceiptByIdAndClient(receipt, id);
    if (!existingReceipt) {
        return next(new CustomError('Receipt not found', 404));
    }

    // Check if the receipt is already closed
    if (existingReceipt.status != 0 || existingReceipt.credit || existingReceipt.deposit || existingReceipt.delivered) {
        return next(new CustomError('You can only cancel new placed orders because maybe it\'s already in preparation', 400));
    }

    // Update the receipt status
    existingReceipt.status = -1;
    existingReceipt.delivered = true;
    const updatedReceipt = await existingReceipt.save();
    if (!updatedReceipt) {
        return next(new CustomError('Error while cancelling receipt, try again', 400));
    }

    // Return the response
    res.status(200).json({ message: 'The receipt was cancelled successfully' });
});
//get statistics receipts for specific store and client
const GetStatisticsForStoreClient = asyncErrorHandler(async (req, res, next) => {
    const { store, client } = req.params;

    // Validate store and Client IDs
    if (!store || !mongoose.Types.ObjectId.isValid(store) || 
        !client || !mongoose.Types.ObjectId.isValid(client)) {
        return next(new CustomError('Invalid store or client ID provided.', 400));
    }

    // Check if the store exists
    const existStore = await findStoreById(store);
    if (!existStore) {
        return next(new CustomError('Store not found', 404));
    }

    // Check if the Client exists for the given store
    const existClient = await checkUserStore(client, store);
    if (!existClient) {
        return next(new CustomError('Client not found', 404));
    }

    // Get statistics for receipt between the store and client
    const totalReceipts = await ReceiptService.countReceiptsByStoreAndClient(store, client);
    const total = await ReceiptService.sumPaymentsForAllReceipts(store, client);
    const totalPaid = await ReceiptService.sumPaidPaymentsForAllReceipts(store, client);
    const totalCreditAnpaid = await ReceiptService.sumCreditsAndUnpaidReceipts(store, client);

    // Respond with the statistics
    res.status(200).json({
        count: totalReceipts,
        total: total.total,
        totalPaid: totalPaid,
        profit: total.profit,
        creditanpaid: totalCreditAnpaid,
    });
});

module.exports = {
    CreateReceipt,
    CreateReceiptFromStore,
    GetReceiptByID,
    GetReceiptByIDForClient,
    GetAllLatestReceiptsByStore,
    GetAllNonedeliveredReceiptsByStore,
    GetAlldeliveredReceiptsByStore,
    GetAllReturnedReceiptsByStore,
    GetAllReceiptsByClient,
    GetAllArchiveReceiptsByClient,
    ValidateMyReceipt,
    UpdateReceiptExpextedDeliveryDate,
    GetAllReceiptsByClientForStore,
    UpdateReceiptProductPrice,
    GetAlldeliveredReceiptsByStoreCredited,
    AddPaymentToReceipt,
    AddFullPaymentToReceipt,
    GetStatisticsForStoreClient,
    updateReceiptStatus,
    UpdateReceiptCredited,
    CancelReceiptByClient,
    CancelReceiptByStore,
    UpdateReceiptDiposit
}