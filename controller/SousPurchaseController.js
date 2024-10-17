const mongoose = require('mongoose');
const validator = require('validator');
const SousPurchase = require('../model/SousPurchaseModel.js');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const PurchaseService = require('../service/PurchaseService.js');
const SousPurchaseService = require('../service/SousPurchaseService.js');
const SousStockService = require('../service/StockStatusService.js');
const moment = require('../util/Moment.js');

//add new SousPurchase to specific Purchase
const CreateNewSousPurchaseByPurchase = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    const { clientSousStocks, purchase } = req.body;
    // Check if all required fields are provided
    if (!purchase || validator.isEmpty(purchase.toString()) ||
        !mongoose.Types.ObjectId.isValid(purchase) ||
        !store || validator.isEmpty(store.toString()) ||
        !mongoose.Types.ObjectId.isValid(store) ||
        !clientSousStocks || clientSousStocks.length <= 0 
        
    ) {
        return next(new CustomError('All fields are required', 400));
    }

    // Check if Purchase already exists in the store
    const existingPurchase = await PurchaseService.findPurchaseByIdAndStore(purchase, store);
    if (!existingPurchase) {
        return next(new CustomError('Purchase not found', 404));
    }

    //check if Purchase is already closed
    if (existingPurchase.closed) {
        return next(new CustomError('Purchase is already closed', 400));
    }

    //get last sous Purchase
    const lastSousPurchase = await SousPurchaseService.findLastSousPurchaseByPurchase(
        existingPurchase.sousPurchases[existingPurchase.sousPurchases.length - 1]
    );
    if (!lastSousPurchase) {
        return next(new CustomError('Sous purchase not found', 404));
    }

    //get current datetime
    const currentDateTime = moment.getCurrentDateTime();

    const session = await mongoose.startSession();
    session.startTransaction();

    try{
        let noChangeCount = 0;
        const updatedSousPurchase = lastSousPurchase.sousStocks.map((sousStock) => {
            const matchingsousStock = clientSousStocks.find(
                (newsousStock) => newsousStock.sousStock.toString() == sousStock._id.toString()
            );
                        
            if (matchingsousStock) {
                let adjustedQuantity = Number(sousStock.quantity);
                adjustedQuantity = Number(sousStock.quantity) - Number(matchingsousStock.quantity);
                //delete sousStock if quantity is zero or no change was made
                if (adjustedQuantity < 0 || adjustedQuantity == Number(sousStock.quantity)) {
                    return null;
                }
                return {
                    ...sousStock,
                    sousStock: sousStock.sousStock,
                    quantity: adjustedQuantity,
                    price: sousStock.price
                };
            }else{
                //count no change was made
                noChangeCount++;
                return sousStock;
            }
            
        });

        if (!updatedSousPurchase[0] || updatedSousPurchase.length <= 0) {
            return next(new CustomError('No changes were made to the purchase', 400));
        }

        //check if all sousStocks were not changed
        if (noChangeCount === lastSousPurchase.sousStocks.length) {
            return next(new CustomError('No changes were made to the purchase', 400));
        }

        // If changes exist, create a new sous purchase
        const newSousPurchase = await SousPurchase.create([
            {
                sousStocks: updatedSousPurchase,
                date: currentDateTime
            }
        ], { session });
        //check if new status was created
        if (!newSousPurchase || !newSousPurchase[0]) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Error while creating new receipt status, try again.', 400));
        }

        //update Purchase total
        const newtotal = updatedSousPurchase.reduce((acc, sousPurchase) => {
            return acc + (Number(sousPurchase.price) * Number(sousPurchase.quantity));
        }, 0);

        existingPurchase.totalAmount = Number(existingPurchase.discount) > 0 
            ? newtotal - (newtotal * (Number(existingPurchase.discount) / 100)) : newtotal;
        existingPurchase.sousPurchases.push(newSousPurchase[0]._id);

        //save Purchase
        const updatedPurchase = await existingPurchase.save({ session });
        if (!updatedPurchase) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Error while updating receipt, try again.', 400));
        }

        //update sous stock
        const updatedSousStock = await SousStockService.updateSousStocks(updatedSousPurchase, session);
        if (!updatedSousStock) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Error while updating sous stock, try again.', 400));
        }

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        // Return the newly created receipt status
        res.status(200).json({message: 'New sous purchase created successfully'});
    }catch(err){
        await session.abortTransaction();
        session.endSession();
        console.log(err);
        next(new CustomError('Error while creating new receipt status, try again.', 400));
    }

});
//fetch last SousPurchase by Purchase
const FetchLiveSousPurchaseByPurchase = asyncErrorHandler(async (req, res, next) => {
    const { id, store } = req.params;
    //validate required fields
    if (!id || !mongoose.Types.ObjectId.isValid(id) ||
        !store || !mongoose.Types.ObjectId.isValid(store)
    ) {
        return next(new CustomError('All fields are required', 400));
    }
    //check if purchase already exist
    const existingPurchase = await PurchaseService.findPurchaseByIdAndStore(id, store);
    if (!existingPurchase) {
        return next(new CustomError('Purchase not found', 404));
    }

    //get last Sous Purchase
    const lastSousPurchase = await SousPurchase.findOne({
        _id: existingPurchase.sousPurchases[existingPurchase.sousPurchases.length - 1]
    }).populate(
        {
            path: 'sousStocks',
            select: 'sousStock quantity price',
            populate: {
                path: 'sousStock',
                select: 'stock buying quantity',
                populate: {
                    path: 'stock',
                    select: 'product',
                    populate: {
                        path: 'product',
                        select: 'name size brand boxItems image',
                        populate: {
                            path: 'brand',
                            select: 'name'
                        }
                    }
                }
            }
        }
    );

    if (!lastSousPurchase) {
        return next(new CustomError('Sous purchase not found', 404));
    }

    res.status(200).json(lastSousPurchase);
});
//fecth all SousPurchase by Purchase
const FetchAllSousPurchaseByPurchase = asyncErrorHandler(async (req, res, next) => {
    const { id, store } = req.params;
    //validate required fields
    if (!id || !mongoose.Types.ObjectId.isValid(id) ||
        !store || !mongoose.Types.ObjectId.isValid(store)
    ) {
        return next(new CustomError('All fields are required', 400));
    }
    //check if purchase already exist
    const existingPurchase = await PurchaseService.findPurchaseByIdAndStore(id, store);
    if (!existingPurchase) {
        return next(new CustomError('Purchase not found', 404));
    }

    //get all sous Purchases
    const allSousPurchases = await SousPurchase.find({
        _id: existingPurchase.sousPurchases
    }).populate(
        {
            path: 'sousStocks',
            select: 'sousStock quantity price',
            populate: {
                path: 'sousStock',
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
            }
        }
    );

    if (!allSousPurchases || allSousPurchases.length <= 0) {
        return next(new CustomError('Sous purchases not found', 404));
    }

    res.status(200).json(allSousPurchases);
});

module.exports = {
    CreateNewSousPurchaseByPurchase,
    FetchLiveSousPurchaseByPurchase,
    FetchAllSousPurchaseByPurchase
};