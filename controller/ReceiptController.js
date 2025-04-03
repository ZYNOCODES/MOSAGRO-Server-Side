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
        return next(new CustomError('Vous devez choisir au moins un produit', 400));
    }
    if (!total || !validator.isNumeric(total.toString())) {
        return next(new CustomError('Le montant total est requis et doit être un nombre valide', 400));
    }
    if (!type) {
        return next(new CustomError('Le type de commande est obligatoire. Vous devez en sélectionner un.', 400));
    }
    if (type === 'delivery' && !deliveredLocation) {
        return next(new CustomError('L\'adresse de livraison est requise', 400));
    }

    // Validate product fields
    const invalidProduct = products.some(product => (
        !mongoose.Types.ObjectId.isValid(product.stock) ||
        !product.quantity || product.quantity <= 0 || !validator.isNumeric(product.quantity.toString()) ||
        !product.price || product.price <= 0 || !validator.isNumeric(product.price.toString())
    ));
    if (invalidProduct) {
        return next(new CustomError('Tous les produits doivent avoir une quantité et un prix valides', 400));
    }

    // Validate total matches the sum of product prices
    const sum = products.reduce((acc, product) => acc + product.price * product.quantity, 0);
    if (sum !== Number(total)) {
        return next(new CustomError('Le montant total ne correspond pas à la somme de tous les prix des produits', 400));
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
                return next(new CustomError(`Produit introuvable. Supprimez tous les produits et réessayez.`, 404));
            }

            // Validate stock quantity
            if (existingStock.quantity < product.quantity) {
                await session.abortTransaction();
                session.endSession();
                return next(new CustomError(
                    `La quantité de ${product.quantity} ${existingStock.product.name} n'est pas disponible. Vous ne pouvez en acheter que ${existingStock.quantity}.`,
                    400
                ));
            }

            // Validate selling price
            if (Number(existingStock.selling) !== Number(product.price)) {
                await session.abortTransaction();
                session.endSession();
                return next(new CustomError(
                    `Le prix ${product.price} de ${existingStock.product.name} n'est pas valide.`,
                    400
                ));
            }

            // Validate quantity limit
            if (existingStock.quantityLimit > 0 && existingStock.quantityLimit < product.quantity) {
                await session.abortTransaction();
                session.endSession();
                return next(new CustomError(
                    `La quantité ${product.quantity} de ${existingStock.product.name} est limitée à ${existingStock.quantityLimit} articles maximum.`,
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
            return next(new CustomError('Le bénéfice total ne peut pas être négatif', 405));
        }

        // Create a new receipt status
        const [newReceiptStatus] = await ReceiptStatus.create([{
            products: products,
            date: currentDateTime
        }], { session });

        if (!newReceiptStatus) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Erreur lors de la création du nouveau statut de commande. Réessayez.', 400));
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
            return next(new CustomError('Erreur lors de la création de la nouvelle commande. Réessayez.', 400));
        }

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        // Return success response
        res.status(200).json({
            message: 'La commande a été soumise avec succès',
            OrderID: newReceipt._id
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Error creating receipt:', error);
        return next(new CustomError('Erreur lors de la création de la nouvelle commande. Réessayez.', 500));
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
        return next(new CustomError('Tous les champs sont obligatoires', 400));
    }
    if (type === 'delivery' && (
        !deliveredLocation || !deliveredAmount || !deliveredExpectedDate
    )
    ) {
        return next(new CustomError('Le lieu de livraison, le montant et la date prévue sont requis', 400));
    }
    if (products.length <= 0) {
        return next(new CustomError('Vous devez choisir au moins un produit', 400));
    }

    // Check if all products have a quantity and price
    if (products.some(val => {
        return (!mongoose.Types.ObjectId.isValid(val.stock)) && 
               (!val.quantity || val.quantity <= 0 || !validator.isNumeric(val.quantity.toString())) && 
               (!val.price || val.price <= 0 || !validator.isNumeric(val.price.toString()));
    })) {
        return next(new CustomError('Tous les produits doivent avoir une quantité et un prix valides', 400));
    }
    //check if total is equal to the sum of all products
    const sum = products.reduce((acc, product) => acc + product.price * product.quantity, 0);
    if (sum != total) {
        return next(new CustomError('Le montant total n\'est pas égal à la somme des prix de tous les produits', 400));
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Check if client exists
        const existingClient = await findUserById(client, session);
        if (!existingClient) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Client non trouvé', 404));
        }

        //check if client is a client for the store
        const isClient = await checkUserStore(client, store, session);
        if (!isClient) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Vous n\'êtes pas client de ce magasin', 405));
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
                return next(new CustomError(`Produit non trouvé, effacez tous les produits et réessayez.`, 404));
            }
            //check if the product quantity is enough
            if (existingStock.quantity < item.quantity) {
                await session.abortTransaction();
                session.endSession();
                return next(
                    new CustomError(
                    `Cette quantité ${item.quantity} de ${existingStock.product.name} n'est pas disponible`,
                    400)
                );
            }
            //check if all price is equal to the selling price and threre is no manipulation
            if (Number(existingStock.selling) != Number(item.price)) {
                await session.abortTransaction();
                session.endSession();
                return next(new CustomError(`Ce prix ${item.price} de ${existingStock.product.name} n'est pas valide`,400));
            }
            //check if Quantity limitation
            if (existingStock.quantityLimit > 0 &&
                existingStock.quantityLimit < item.quantity) {
                await session.abortTransaction();
                session.endSession();
                return next(
                    new CustomError(
                    `Cette quantité ${item.quantity} de ${existingStock.product.name} est limitée à ${existingStock.quantityLimit} articles maximum`,
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
            return next(new CustomError('Le bénéfice total ne peut pas être négatif', 405));
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
            return next(new CustomError('Erreur lors de la création d\'un nouveau statut de commande, réessayez.', 400));
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
            return next(new CustomError('Erreur lors de la création d\'une nouvelle commande, réessayez', 400));
        }

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: 'La commande a été soumise avec succès', id: newReceipt[0]._id});
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.log(error)
        return next(new CustomError('Erreur lors de la création d\'une nouvelle commande, réessayez', 500));
    }
});
//get specific Receipt
const GetReceiptByID = asyncErrorHandler(async (req, res, next) => {
    const { id, store } = req.params;
    //check all required fields
    if( !id || !mongoose.Types.ObjectId.isValid(id)){
        return next(new CustomError('Tous les champs sont obligatoires', 400));
    }
    const existingreceipt = await Receipt.findOne({
        _id: id,
        store
    }).populate({
        path: 'client',
        select: 'firstName lastName phoneNumber email wilaya commune'
    });
    if(!existingreceipt){
        return next(new CustomError('Commande non trouvée', 404));
    }
    res.status(200).json(existingreceipt);
});
//get specific Receipt for client
const GetReceiptByIDForClient = asyncErrorHandler(async (req, res, next) => {
    const { receipt } = req.params;
    //check all required fields
    if( !receipt || !mongoose.Types.ObjectId.isValid(receipt)){
        return next(new CustomError('Tous les champs sont obligatoires', 400));
    }
    const existingreceipt = await Receipt.findById({
        _id: receipt
    }).populate({
        path: 'store',
        select: 'storeName'
    });
    //check existingreceipt
    if(!existingreceipt){
        return next(new CustomError('Commande non trouvée', 404));
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
        return next(new CustomError('Statut de la commande non trouvé', 404));
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
        const err = new CustomError('Aucune commande trouvée pour vous', 400);
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
                return next(new CustomError('Statut de la commande non trouvé', 404));
            }

            // Create an updated receipt with ordersList and replace the original receipt
            receipts[i] = {
                ...receipt.toObject(),  // Copy the original receipt's properties
                products: lastReceiptStatus.products  // Attach the ordersList
            };
        } else {
            const err = new CustomError('Aucun produit trouvé pour cette commande', 400);
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
    }).populate({
        path: 'client',
        select: 'firstName lastName phoneNumber'
    });

    if(receipts.length <= 0){
        const err = new CustomError('Aucune commande trouvée pour vous', 400);
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
                return next(new CustomError('Statut de la commande non trouvé', 404));
            }

            // Create an updated receipt with ordersList and replace the original receipt
            receipts[i] = {
                ...receipt.toObject(),  // Copy the original receipt's properties
                products: lastReceiptStatus.products  // Attach the ordersList
            };
        } else {
            const err = new CustomError('Aucun produit trouvé pour cette commande', 400);
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
        const err = new CustomError('Aucune commande livrée trouvée pour vous', 400);
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
                return next(new CustomError('Statut de la commande non trouvé', 404));
            }

            // Create an updated receipt with ordersList and replace the original receipt
            receipts[i] = {
                ...receipt.toObject(),  // Copy the original receipt's properties
                products: lastReceiptStatus.products  // Attach the ordersList
            };
        } else {
            const err = new CustomError('Aucun produit trouvé pour cette commande', 400);
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
        const err = new CustomError('Aucune commande livrée créditée trouvée pour vous', 400);
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
                return next(new CustomError('Statut de la commande non trouvé', 404));
            }

            // Create an updated receipt with ordersList and replace the original receipt
            receipts[i] = {
                ...receipt.toObject(),  // Copy the original receipt's properties
                products: lastReceiptStatus.products  // Attach the ordersList
            };
        } else {
            const err = new CustomError('Aucun produit trouvé pour cette commande', 400);
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
        const err = new CustomError('Aucune commande retournée trouvée pour vous', 400);
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
                return next(new CustomError('Statut de la commande non trouvé', 404));
            }

            // Create an updated receipt with ordersList and replace the original receipt
            receipts[i] = {
                ...receipt.toObject(),  // Copy the original receipt's properties
                products: lastReceiptStatus.products  // Attach the ordersList
            };
        } else {
            const err = new CustomError('Aucun produit trouvé pour cette commande', 400);
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
        const err = new CustomError('Aucune commande trouvée pour vous', 400);
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
                return next(new CustomError('Statut de la commande non trouvé', 404));
            }

            // Create an updated receipt with ordersList and replace the original receipt
            receipts[i] = {
                ...receipt.toObject(),  // Copy the original receipt's properties
                products: lastReceiptStatus.products  // Attach the ordersList
            };
        } else {
            const err = new CustomError('Aucun produit trouvé pour cette commande', 400);
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
        const err = new CustomError('Aucune commande trouvée pour vous', 400);
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
                return next(new CustomError('Statut de la commande non trouvé', 404));
            }

            // Create an updated receipt with ordersList and replace the original receipt
            receipts[i] = {
                ...receipt.toObject(),  // Copy the original receipt's properties
                products: lastReceiptStatus.products  // Attach the ordersList
            };
        } else {
            const err = new CustomError('Aucun produit trouvé pour cette commande', 400);
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
        return next(new CustomError('Tous les champs sont obligatoires', 400));
    }

    // Check if the client exists
    const existingClient = await findUserById(client);
    if (!existingClient) {
        return next(new CustomError('Client non trouvé', 404));
    }

    // Fetch all receipts for the client in the specified store
    const receipts = await Receipt.find({
        client: client,
        store: store,
    });

    // Check if any receipts were found
    if (receipts.length <= 0) {
        const err = new CustomError('Aucune commande trouvée pour ce client', 400);
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
                return next(new CustomError('Statut de la commande non trouvé', 404));
            }

            // Create an updated receipt with ordersList and replace the original receipt
            receipts[i] = {
                ...receipt.toObject(),  // Copy the original receipt's properties
                products: lastReceiptStatus.products  // Attach the ordersList
            };
        } else {
            const err = new CustomError('Aucun produit trouvé pour cette commande', 400);
            return next(err);
        }
    }

    // Send the response with all data in the same object
    res.status(200).json(receipts);
});
//validate delivered
const ValidateMyReceipt = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { reciept, status, raison } = req.body;
    //check id 
    if( !reciept || !mongoose.Types.ObjectId.isValid(reciept) || !status ){
        return next(new CustomError('Tous les champs sont obligatoires', 400));
    }
    //check if status is valid [3 or 4]
    if(![3, 4].includes(status)){
        return next(new CustomError('Le statut n\'est pas valide', 400));
    }
    //check if the status is 4 and the raison is empty
    if(status === 4 && !raison){
        return next(new CustomError('Vous devez fournir une raison', 400));
    }
    
    //check if receipt exist
    const existingreceipt = await findReceiptByIdAndClient(reciept, id);
    if(!existingreceipt){
        return next(new CustomError('Commande non trouvée', 404));
    }
    //check if the receipt is already delivered
    if(existingreceipt.delivered){
        return next(new CustomError('Cette commande est déjà livrée', 400));
    }
    //update 
    const updatedreceipt = await Receipt.updateOne({ _id: reciept }, { 
        delivered: true,
        status: status,
        returnedRaison: raison,
        expextedDeliveryDate: moment.getCurrentDateTime()
    });
    // Check if receipt updated successfully
    if (!updatedreceipt) {
        const err = new CustomError('Erreur lors de la mise à jour de la commande, réessayez.', 400);
        return next(err);
    }
    res.status(200).json({ message: 'La validation a été soumise avec succès' });
});
//update receipt expexted delivery date
const UpdateReceiptExpextedDeliveryDate = asyncErrorHandler(async (req, res, next) => {
    const { id, store } = req.params;
    const { date } = req.body;
    //check the fields
    if( !id || !date 
        || !mongoose.Types.ObjectId.isValid(id)){
        return next(new CustomError('Tous les champs sont obligatoires', 400));
    }
    //check if receipt exist
    const existingreceipt = await findReceiptByIdAndStore(id, store);
    if(!existingreceipt){
        return next(new CustomError('Commande non trouvée', 404));
    }
    existingreceipt.expextedDeliveryDate = date;
    //update 
    const updatedreceipt = await existingreceipt.save();
    // Check if receipt updated successfully
    if (!updatedreceipt) {
        const err = new CustomError('Erreur lors de la mise à jour de la commande, réessayez.', 400);
        return next(err);
    }
    res.status(200).json({ message: 'La date de livraison prévue a été soumise avec succès' });
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
            return next(new CustomError('Tous les champs sont obligatoires', 400));
        }

        // Check if the receipt exists
        const existingReceipt = await findNoneDeliveredReceiptByStore(store, id, session);
        if (!existingReceipt) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Commande non trouvée', 404));
        }

        // Check if the stock exists in the receipt
        const stockIndex = existingReceipt.products.findIndex(val => val.stock.toString() === stock);
        if (stockIndex === -1) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Produit non trouvé dans la commande', 404));
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
            throw new CustomError('Erreur lors de la mise à jour de la commande, réessayez.', 400);
        }

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: 'Le prix du produit a été soumis avec succès' });

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
        const err = new CustomError('Tous les champs sont obligatoires', 400);
        return next(err);
    }
    // Check if the amount is valid
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
        const err = new CustomError('Entrez un montant positif valide', 400);
        return next(err);
    }

    //check if receipt exist
    const existingReceipt = await Receipt.findOne({
        _id: id,
        store: store,
    });
    if(!existingReceipt){
        return next(new CustomError('Commande non trouvée', 404));
    }

    //check if the receipt is status between 0, 1, 2
    if([0, 1].includes(existingReceipt.status)){
        const err =new CustomError(`Cette commande n'est pas prête à être payée, vérifiez l'état de la commande`, 400);
        return next(err);
    }

    //check if already closed
    if(existingReceipt.status == 10){
        const err =new CustomError(`Cette commande est déjà entièrement payée`, 400);
        return next(err);
    }

    //check if the receipt is credited
    if (existingReceipt.credit == false) {
        const err = new CustomError('Vous ne pouvez pas ajouter de paiement car cette commande n\'est pas créditée', 400);
        return next(err);
    }

    // Calculate the sum of existing payments
    const totalPaid = existingReceipt.payment.reduce((acc, val) => acc + val.amount, 0);

    // Validate payment against the total
    if ((totalPaid + parseFloat(amount)) > existingReceipt.total) {
        const err =new CustomError(`La somme des paiements est supérieure au total. Le montant restant à payer est ${existingReceipt.total - totalPaid}`, 400);
        return next(err);
    }

    //check if this receipt is credited or not
    if(existingReceipt.credit == false){
        // Validate payment against the total
        if ((parseFloat(amount)) != parseFloat(existingReceipt.total)) {
            const err =new CustomError(`Le paiement doit être égal au prix total. Le montant restant à payer est ${existingReceipt.total}`, 400);
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
        const err = new CustomError('Erreur lors de l\'ajout du paiement à la commande, réessayez', 400);
        return next(err);
    }
    // Return the response
    res.status(200).json({ message: 'Le paiement a été soumis avec succès' });
});
//add payments tp Receipt
const AddFullPaymentToReceipt = asyncErrorHandler(async (req, res, next) => {
    const { id, store } = req.params;
    
    // Get current date with Algiers timezone
    const currentDateTime = moment.getCurrentDateTime(); // Ensures UTC+1

    // Validate ID
    if(!id || !mongoose.Types.ObjectId.isValid(id)){
        const err = new CustomError('Tous les champs sont obligatoires', 400);
        return next(err);
    }

    //check if receipt exist
    const existingReceipt = await Receipt.findOne({
        _id: id,
        store: store,
    });
    if(!existingReceipt){
        return next(new CustomError('Commande non trouvée', 404));
    }
    //check if the receipt is status between 0, 1, 2
    if([0, 1].includes(existingReceipt.status)){
        const err =new CustomError(`Cette commande n'est pas prête pour le paiement intégral, vérifiez l'état de la commande`, 400);
        return next(err);
    }
    //check if already closed
    if(existingReceipt.status == 10){
        const err =new CustomError(`Cette commande est déjà entièrement payée`, 400);
        return next(err);
    }
    //check if already cancelled
    if(existingReceipt.status == -2 || existingReceipt.status == -1){
        const err =new CustomError(`Cette commande est déjà annulée`, 400);
        return next(err);
    }

    //check if the receipt is credited
    if (existingReceipt.credit == true) {
        const err = new CustomError('Vous ne pouvez pas ajouter le paiement complet car cette commande est créditée', 400);
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
        const err = new CustomError('Erreur lors de l\'ajout du paiement complet, réessayez.', 400);
        return next(err);
    }

    res.status(200).json({ message: 'Paiement total ajouté avec succès' });
});
//make reciept status
const updateReceiptStatus = asyncErrorHandler(async (req, res, next) => {
    const { status, id } = req.body;

    // Validate ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        const err = new CustomError('Tous les champs sont obligatoires', 400);
        return next(err);
    }

    // Validate status
    if (isNaN(status) || Number(status) < 0 ||
        !validator.isIn(status.toString(), ['0', '1', '2'])
    ) {
        const err = new CustomError('Entrez un statut valide', 400);
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
            return next(new CustomError('Commande non trouvée', 404));
        }

        // Check if receipt is already closed
        if (existingReceipt.status == 10) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Cette commande est déjà entièrement payée', 400));
        }
        // Check if receipt is already canceled
        if (existingReceipt.status == -2 || existingReceipt.status == -1) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Cette commande est déjà annulée', 400));
        }
        // Check if receipt is already delivered
        if (existingReceipt.delivered) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Cette commande est déjà livrée', 400));
        }
        // Check if receipt is already have same status
        if (existingReceipt.status == status) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Cette commande a déjà le même statut', 400));
        }

        // Update receipt status
        existingReceipt.status = status;
        const updatedReceipt = await existingReceipt.save({ session });

        // Check if receipt was updated successfully
        if (!updatedReceipt) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Erreur lors de la mise à jour de la commande, réessayez.', 400));
        }

        // Check if a notification needs to be created
        const orderDelivered = status == 2 && existingReceipt.type == 'delivery';
        const orderReady = status == 2 && existingReceipt.type == 'pickup';
        if (orderDelivered || orderReady) {
            // message to send 
            const msg = orderReady ?
                    `Votre commande de ${existingReceipt.store.storeName} est prête à être récupérée`
                    :
                    `Votre commande de ${existingReceipt.store.storeName} a été livré et est en route vers vous`
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
                return next(new CustomError('Erreur lors de la création d\'une nouvelle notification, réessayez', 400));
            }
        }

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        // Return the response
        res.status(200).json({ message: 'Le statut a été mis à jour avec succès' });
    } catch (error) {
        // Abort the transaction on error
        await session.abortTransaction();
        session.endSession();
        console.error('Error updating receipt status:', error);
        // Handle other errors
        return next(new CustomError('Une erreur s\'est produite lors de la mise à jour du statut de la commande.', 500));
    }
});
//Update Receipt credit
const UpdateReceiptCredited = asyncErrorHandler(async (req, res, next) => {
    const { id, store } = req.params;
    const { credited } = req.body;
    if(!id || !mongoose.Types.ObjectId.isValid(id)
    ){
        const err = new CustomError('Tous les champs sont obligatoires', 400);
        return next(err);
    }
    if(!validator.isBoolean(credited.toString())){
        const err = new CustomError('Entrez une valeur valide', 400);
        return next(err);
    }

    //check if receipt exist
    const existingReceipt = await Receipt.findOne({
        _id: id,
        store: store
    });
    if(!existingReceipt){
        return next(new CustomError('Commande non trouvée', 404));
    }

    //check if already closed
    if(existingReceipt.status == 10){
        const err =new CustomError(`Cette commande est déjà entièrement payée`, 400);
        return next(err);
    }

    //check if reciept is a returned receipt
    if(existingReceipt.status == 9){
        const err =new CustomError(`Cette commande est une commande retournée, vous ne pouvez pas la faire créditer`, 400);
        return next(err);
    }

    //check if already cancelled
    if(existingReceipt.status == -2 || existingReceipt.status == -1){
        const err =new CustomError(`Cette commande est déjà annulée`, 400);
        return next(err);
    }
    
    //check if already deposit
    if(existingReceipt.deposit == true){
        const err =new CustomError(`Vous ne pouvez pas le créditer car il s'agit déjà d'une commande deposit`, 400);
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
        const err = new CustomError('Erreur lors de la mise à jour du crédit de la commande, réessayez', 400);
        return next(err);
    }
    // Return the response
    res.status(200).json({ message: `Commander maintenant est ${credited ? "" : "n'est pas "}créditée` });
});
//Update Receipt deposit
const UpdateReceiptDiposit = asyncErrorHandler(async (req, res, next) => {
    const { id, store } = req.params;
    const { deposit } = req.body;
    if(!id || !mongoose.Types.ObjectId.isValid(id)){
        const err = new CustomError('Tous les champs sont obligatoires', 400);
        return next(err);
    }
    if(!validator.isBoolean(deposit.toString())){
        const err = new CustomError('Entrez une valeur valide', 400);
        return next(err);
    }

    //check if receipt exist
    const existingReceipt = await Receipt.findOne({
        _id: id,
        store: store
    });
    if(!existingReceipt){
        return next(new CustomError('Commande non trouvée', 404));
    }

    //check if already closed
    if(existingReceipt.status == 10){
        const err =new CustomError(`Cette commande est déjà entièrement payée`, 400);
        return next(err);
    }

    //check if reciept is a returned receipt
    if(existingReceipt.status == 9){
        const err =new CustomError(`Cette commande est une commande retournée, vous ne pouvez pas le fait deposit`, 400);
        return next(err);
    }

    //check if already cancelled
    if(existingReceipt.status == -2 || existingReceipt.status == -1){
        const err =new CustomError(`Cette commande est déjà annulée`, 400);
        return next(err);
    }

    //check if already credited
    if(existingReceipt.credit == true){
        const err =new CustomError(`Vous ne pouvez pas le fait deposit car il s'agit déjà d'une commande créditée`, 400);
        return next(err);
    }

    // Save updated receipt
    if(deposit === false){
        existingReceipt.deposit = deposit;
    }
    existingReceipt.deposit = deposit;

    const updatedReceipt = await existingReceipt.save();
    if (!updatedReceipt) {
        const err = new CustomError('Erreur lors de la mise à jour de la commande, réessayez', 400);
        return next(err);
    }
    // Return the response
    res.status(200).json({ message: `Commander maintenant est ${deposit ? "" : "non "}deposit` });
});
//cancel receipt by store
const CancelReceiptByStore = asyncErrorHandler(async (req, res, next) => {
    const { store, id } = req.params;
    // Validate ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        const err = new CustomError('Tous les champs sont obligatoires', 400);
        return next(err);
    }

    // Check if the receipt exists
    const existingReceipt = await findReceiptByIdAndStore(id, store);
    if (!existingReceipt) {
        return next(new CustomError('Commande non trouvée', 404));
    }

    // Check if the receipt is already closed
    if (existingReceipt.status != 0 || existingReceipt.credit || existingReceipt.deposit || existingReceipt.delivered) {
        return next(new CustomError('Vous ne pouvez annuler que les nouvelles commandes passées', 400));
    }

    // Update the receipt status
    existingReceipt.status = -2;
    existingReceipt.delivered = true;
    const updatedReceipt = await existingReceipt.save();
    if (!updatedReceipt) {
        return next(new CustomError('Erreur lors de l\'annulation de la commande, réessayez', 400));
    }

    // Return the response
    res.status(200).json({ message: 'La commande a été annulée avec succès' });
});
//cancel receipt by client
const CancelReceiptByClient = asyncErrorHandler(async (req, res, next) => {
    const { receipt, id } = req.params;
    // Validate ID
    if (!receipt || !mongoose.Types.ObjectId.isValid(receipt)) {
        const err = new CustomError('Tous les champs sont obligatoires', 400);
        return next(err);
    }

    // Check if the receipt exists
    const existingReceipt = await findReceiptByIdAndClient(receipt, id);
    if (!existingReceipt) {
        return next(new CustomError('Commande non trouvée', 404));
    }

    // Check if the receipt is already closed
    if (existingReceipt.status != 0 || existingReceipt.credit || existingReceipt.deposit || existingReceipt.delivered) {
        return next(new CustomError('Vous ne pouvez annuler que les nouvelles commandes passées car elles sont peut-être déjà en préparation', 400));
    }

    // Update the receipt status
    existingReceipt.status = -1;
    existingReceipt.delivered = true;
    const updatedReceipt = await existingReceipt.save();
    if (!updatedReceipt) {
        return next(new CustomError('Erreur lors de l\'annulation de la commande, réessayez', 400));
    }

    // Return the response
    res.status(200).json({ message: 'La commande a été annulée avec succès' });
});
//get statistics receipts for specific store and client
const GetStatisticsForStoreClient = asyncErrorHandler(async (req, res, next) => {
    const { store, client } = req.params;

    // Validate store and Client IDs
    if (!store || !mongoose.Types.ObjectId.isValid(store) || 
        !client || !mongoose.Types.ObjectId.isValid(client)) {
        return next(new CustomError('Tous les champs sont obligatoires', 400));
    }

    // Check if the store exists
    const existStore = await findStoreById(store);
    if (!existStore) {
        return next(new CustomError('Magasin non trouvé', 404));
    }

    // Check if the Client exists for the given store
    const existClient = await checkUserStore(client, store);
    if (!existClient) {
        return next(new CustomError('Client non trouvé', 404));
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