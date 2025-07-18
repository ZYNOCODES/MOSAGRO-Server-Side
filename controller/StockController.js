const mongoose = require('mongoose');
const Stock = require('../model/StockModel');
const validator = require('validator');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const StockService = require('../service/StockService.js');
const StoreService = require('../service/StoreService.js');
const ProductService = require('../service/ProductService.js');
const StockStatusService = require('../service/StockStatusService.js');
const FavoriteService = require('../service/FavoriteService.js');
const moment = require('../util/Moment.js');

//Create a new stock
const CreateStock = asyncErrorHandler(async (req, res, next) => {
    const { Product, Store, BuyingPrice, SellingPrice, Quantity, QuantityUnity,
        LimitedQuantity, ExparationDate, BuyingMathode, Destocking } = req.body;
    // Check if all required fields are provided
    if (!Product || !Store || !BuyingMathode ||
        !BuyingPrice || !SellingPrice || 
        !validator.isNumeric(BuyingPrice.toString()) || 
        !validator.isNumeric(SellingPrice.toString())  ||
        !mongoose.Types.ObjectId.isValid(Product) || 
        !mongoose.Types.ObjectId.isValid(Store)
    ) {
        return next(new CustomError('Tout les champs obligatoires doivent être remplis', 400));
    }
    //check if Quantity is a positive number
    if(Number(QuantityUnity) <= 0 && Number(Quantity) <= 0){
        return next(new CustomError('La quantité doit être un nombre positif', 400));
    }

    //check if BuyingPrice and SellingPrice is a positive number
    if(Number(BuyingPrice) <= 0 || Number(SellingPrice) <= 0){
        return next(new CustomError('Prix d\'achat et prix de vente doivent être des nombres positifs', 400));
    }
    //check if buying price is greater than selling price
    if(Number(BuyingPrice) >= Number(SellingPrice)){
        return next(new CustomError('Prix d\'achat doit être inférieur au prix de vente', 400));
    }
    //check if BuyingMathode is provided
    if(!BuyingMathode.buyingByUnit && !BuyingMathode.buyingByBox){
        return next(new CustomError('La méthode d\'achat doit être fournie', 400));
    }
    //check if LimitedQuantity and Destocking is valid
    if((!validator.isEmpty(LimitedQuantity.toString()) && !validator.isNumeric(LimitedQuantity.toString())) ||
        (!validator.isEmpty(Destocking.toString()) && !validator.isNumeric(Destocking.toString()))
    ){
        return next(new CustomError('La limitation de quantité et le destockage doivent être des nombres', 400));
    }
    //check if ExparationDate is valid
    if(ExparationDate && !validator.isDate(ExparationDate)){
        return next(new CustomError('La date d\'expiration doit être une date valide', 400));
    }

    //get current datetime
    const currentDateTime = moment.getCurrentDateTime(); // Ensures UTC+1

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        // Check if product already exists
        const product = await ProductService.findProductById(Product, session);
        if (!product) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Produit non trouvé', 404));
        }

        // Check if store already exists
        const store = await StoreService.findStoreById(Store, session);
        if (!store) {
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('Magasin non trouvé', 404));
        }

        //if product category is in store category list
        if(!store.categories.includes(product.category.toString())){
            await session.abortTransaction();
            session.endSession();
            return next(new CustomError('La catégorie du produit n\'est pas dans la liste des catégories du magasin', 400));
        }
        // recalculate the quantity 
        const newQuantity = (Number(Quantity) * Number(product.boxItems)) + Number(QuantityUnity);
      
        // Check if stock already exists
        const stock = await StockService.findStockByStoreAndProduct(Store, Product, session);
        if (stock) {
            // Add new stock status
            const stockStatus = await StockStatusService.createStockStatus(
                currentDateTime,
                stock._id,
                BuyingPrice,
                SellingPrice,
                newQuantity,
                ExparationDate,
                session
            );

            if (!stockStatus[0]) {
                await session.abortTransaction();
                session.endSession();
                return next(new CustomError('Une erreur s\'est produite lors de la création du statut de stock, réessayez.', 400));
            }
            //
            const buyingMathode = BuyingMathode.buyingByUnit && BuyingMathode.buyingByBox 
            ? 'both' 
            : (BuyingMathode.buyingByUnit 
                ? 'unity' 
                : (BuyingMathode.buyingByBox ? 'box' : null)
            );

            stock.buying = Number(BuyingPrice);
            stock.selling = Number(SellingPrice);
            stock.quantityLimit = Number(LimitedQuantity) > 0 ? Number(LimitedQuantity) : 0;
            stock.destocking = Number(Destocking) > 0 ? Number(Destocking) : 0;
            stock.buyingMathode = buyingMathode;
            stock.quantity += Number(newQuantity);
            await stock.save({ session });

            await session.commitTransaction();
            session.endSession();
            return res.status(200).json({ message: 'Le stock est déjà existant, le statut de stock a été mis à jour avec succès' });
        }else{
            //check if Quantity is greater than LimitedQuantity
            if(Number(LimitedQuantity) > 0 && Number(newQuantity) < Number(LimitedQuantity)){
                await session.abortTransaction();
                session.endSession();
                return next(new CustomError('La quantité doit être supérieure ou égale à la quantité limitée', 400));
            }
            //check if Quantity is greater than Destocking
            if(Number(Destocking) > 0 && Number(newQuantity) < Number(Destocking)){
                await session.abortTransaction();
                session.endSession();
                return next(new CustomError('La quantité doit être supérieure ou égale au destockage', 400));
            }

            const buyingMathode = BuyingMathode.buyingByUnit && BuyingMathode.buyingByBox 
            ? 'both' 
            : (BuyingMathode.buyingByUnit 
                ? 'unity' 
                : (BuyingMathode.buyingByBox ? 'box' : null)
            );

            // Create a new stock
            const newStock = await Stock.create([{
                product: Product,
                store: Store,
                quantity: Number(newQuantity),
                buying: BuyingPrice,
                selling: SellingPrice,
                quantityLimit: Number(LimitedQuantity) > 0 ? Number(LimitedQuantity) : 0,
                destocking: Number(Destocking) > 0 ? Number(Destocking) : 0,
                buyingMathode: buyingMathode,
            }], { session });
            if (!newStock[0]) {
                await session.abortTransaction();
                session.endSession();
                return next(new CustomError('Erreur lors de la création du stock, réessayez.', 400));
            }

            // Create a new stock status
            const stockStatus = await StockStatusService.createStockStatus(
                currentDateTime,
                newStock[0]._id,
                BuyingPrice,
                SellingPrice,
                newQuantity,
                ExparationDate,
                session
            );
            if (!stockStatus[0]) {
                await session.abortTransaction();
                session.endSession();
                return next(new CustomError('Erreur lors de la création du statut de stock, réessayez.', 400));
            }

            await session.commitTransaction();
            session.endSession();

            res.status(200).json({ message: 'Le stock a été créé avec succès' });
        }
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.log(error);
        next(new CustomError('Erreur lors de la création du stock, réessayez.', 400));
    }
});
//fetch stock by id
const FetchStockByID = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    //check if id is valid
    if(!mongoose.Types.ObjectId.isValid(id)){
        const err = new CustomError('Tout les champs obligatoires doivent être remplis', 400);
        return next(err);
    }
    //check if stock already exist
    const stock = await Stock.findById(id).populate(
        {
            path:'product',
            select: '_id code name size boxItems image brand category',
            populate: [
                {
                    path: 'brand',
                    select: 'name'
                },
                {
                    path: 'category',
                    select: 'name'
                }
            ]
        }
    );
    if(!stock){
        const err = new CustomError('Stock non trouvé', 404);
        return next(err);
    }
    res.status(200).json(stock);
});
//fetch all stock by store 
const FetchStockByStore = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    //fetch all stock by store
    const stocks = await Stock.find({
        store: store
    }).populate({
        path:'product',
        select: '_id code name size image brand boxItems category',
        populate: {
            path: 'brand',
            select: 'name'
        }
    });
    if(!stocks){
        const err = new CustomError('Aucun stock trouvé', 404);
        return next(err);
    }
    res.status(200).json(stocks);
});
//fetch all stock by store for client
const FetchStockByStoreClient = asyncErrorHandler(async (req, res, next) => {
    const { id, store } = req.params;
    //check if id is valid
    if(!mongoose.Types.ObjectId.isValid(store)){
        const err = new CustomError('Tout les champs obligatoires doivent être remplis', 400);
        return next(err);
    }
    //fetch all stock by store
    const stocks = await Stock.find({
        store: store
    }).populate({
        path:'product',
        select: '_id code name size image brand boxItems',
        populate: {
            path: 'brand',
            select: 'name image'
        }
    });
    if(!stocks || stocks.length <= 0){
        const err = new CustomError('Aucun stock trouvé', 404);
        return next(err);
    }
    //check every stock if is a favorite stock by client
    const updatedStocks = await Promise.all(
        stocks.map(async (item) => {
            const isFavorite = await FavoriteService.checkProductInFavorite(
                id,
                store,
                item._id
            );
            return {
                ...item.toObject(), // Ensure the Mongoose document is converted to a plain object
                isFavorite: isFavorite,
            };
        })
    );
    if(!updatedStocks || updatedStocks.length <= 0){
        const err = new CustomError('Aucun stock trouvé', 404);
        return next(err);
    }
    res.status(200).json(updatedStocks);
});
//update stock
const UpdateStock = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { BuyingPrice, SellingPrice, Quantity } = req.body;
    // check if one required fields are provided
    if((!BuyingPrice && !SellingPrice) && !Quantity){
        const err = new CustomError('Le prix d\'achat, le prix de vente ou la quantité est requis', 400);
        return next(err);
    }
    // check if price is provided
    if((BuyingPrice && !SellingPrice) || (!BuyingPrice && SellingPrice)){
        const err = new CustomError('Le prix d\'achat et le prix de vente sont requis', 400);
        return next(err);
    }
    //check if stock already exist
    const stock = await StockService.findStockById(id);
    if(!stock){
        const err = new CustomError('Stock non trouvé', 404);
        return next(err);
    }
    //update stock
    if(Quantity) stock.quantity = Quantity;
    if(BuyingPrice) stock.buying = BuyingPrice;
    if(SellingPrice) stock.selling = SellingPrice;
    //save updated stock
    const updatedStock = await stock.save();
    if(!updatedStock){
        const err = new CustomError('Erreur lors de la mise à jour du stock, réessayez.', 400);
        return next(err);
    }
    res.status(200).json({message: 'Stock mis à jour avec succès'});
});
//update stock quantity limitation
const UpdateStockBasicInformation = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { QuantityLimit, Destockage, BuyingMathode, SellingPrice } = req.body;
    // check if QuantityLimit is provided
    if(!mongoose.Types.ObjectId.isValid(id) || 
        ((validator.isEmpty(QuantityLimit.toString()) || !validator.isNumeric(QuantityLimit.toString())) &&
        (validator.isEmpty(Destockage.toString())  || !validator.isNumeric(Destockage.toString())) && 
        (validator.isEmpty(SellingPrice.toString())  || !validator.isNumeric(SellingPrice.toString())) &&
        validator.isEmpty(BuyingMathode.toString()))
    ){
        const err = new CustomError('Un des champs doit être rempli', 400);
        return next(err);
    }
    //check if stock already exist
    const stock = await StockService.findStockById(id);
    if(!stock){
        const err = new CustomError('Stock non trouvé', 404);
        return next(err);
    }
    //update stock
    if(QuantityLimit) stock.quantityLimit = QuantityLimit;
    if(Destockage) stock.destocking = Destockage;
    if(SellingPrice) stock.selling = SellingPrice;
    const buyingMathode = BuyingMathode.toLowerCase() == 'both' ? 'both' : (BuyingMathode.toLowerCase() == 'unity'
        ? 'unity'
        : (BuyingMathode.toLowerCase() == 'box' ? 'box' : null)
    );
    if(BuyingMathode) stock.buyingMathode = buyingMathode;
    //save updated stock
    const updatedStock = await stock.save();
    if(!updatedStock){
        const err = new CustomError('Erreur lors de la mise à jour du stock, réessayez.', 400);
        return next(err);
    }
    res.status(200).json({message: 'Stock mis à jour avec succès'});
});
//delete stock
const DeleteStock = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    //check if stock already exist
    const stock = await StockService.findStockById(id);
    if(!stock){
        const err = new CustomError('Stock non trouvé', 404);
        return next(err);
    }
    //delete stock
    const deletedStock = await Stock.deleteOne({_id: id});
    if(!deletedStock){
        const err = new CustomError('Erreur lors de la suppression du stock, réessayez.', 400);
        return next(err);
    }
    res.status(200).json({message: 'Stock supprimé avec succès'});
});

module.exports = {
    CreateStock,
    FetchStockByID,
    FetchStockByStore,
    FetchStockByStoreClient,
    UpdateStock,
    UpdateStockBasicInformation,
    DeleteStock,
}