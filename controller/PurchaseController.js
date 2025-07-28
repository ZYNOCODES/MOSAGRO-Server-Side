const mongoose = require("mongoose");
const validator = require("validator");
const Purchase = require("../model/PurchaseModel.js");
const CustomError = require("../util/CustomError.js");
const asyncErrorHandler = require("../util/asyncErrorHandler.js");
const FournisseurService = require("../service/FournisseurService.js");
const ProductService = require("../service/ProductService.js");
const PurchaseService = require("../service/PurchaseService.js");
const StockService = require("../service/StockService.js");
const StockStatusService = require("../service/StockStatusService.js");
const CitiesService = require("../service/CitiesService.js");
const SousPurchaseService = require("../service/SousPurchaseService.js");
const moment = require("../util/Moment.js");

//create a new Purchase
const CreatePurchase = asyncErrorHandler(async (req, res, next) => {
  const { store } = req.params;
  const { fournisseur, amount, products, Discount } = req.body;
  // check if all required fields are provided
  if (
    !fournisseur ||
    !mongoose.Types.ObjectId.isValid(fournisseur) ||
    !products
  ) {
    const err = new CustomError("Tous les champs sont obligatoires", 400);
    return next(err);
  }
  //check if products is empty
  if (!Array.isArray(products) || products.length < 1) {
    const err = new CustomError(
      "Vous devez sélectionner au moins un produit",
      400
    );
    return next(err);
  }
  // Check if the amount is valid
  if (
    isNaN(amount) ||
    !validator.isNumeric(amount.toString()) ||
    Number(amount) <= 0
  ) {
    const err = new CustomError("Entrez un montant positif valide > 0", 400);
    return next(err);
  }

  //check if the Discount is valid
  if (
    isNaN(Discount) ||
    !validator.isNumeric(Discount.toString()) ||
    Number(Discount) < 0
  ) {
    const err = new CustomError("Entrez une remise positif valide > 0", 400);
    return next(err);
  }

  //check if discount greater then amount
  if (Number(Discount) > Number(amount)) {
    const err = new CustomError(
      "Remise non valide, la remise doit être inférieure au montant total",
      400
    );
    return next(err);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Parallel execution to speed up store and fournisseur validation
    const [existFournisseur] = await Promise.all([
      FournisseurService.findFournisseurByIdANDStore(fournisseur, store),
    ]);

    if (!existFournisseur) {
      throw new CustomError("Fournisseur introuvable", 404);
    }

    const productTasks = products.map(async (product) => {
      if (
        !product.productID ||
        !mongoose.Types.ObjectId.isValid(product.productID)
      ) {
        throw new CustomError("Produit introuvable", 400);
      }
      //check if the product exist in the store
      const existProduct = await ProductService.findProductById(
        product.productID
      );
      if (!existProduct) {
        throw new CustomError("Produit introuvable", 404);
      }
      if (
        !product.quantity ||
        isNaN(product.quantity) ||
        Number(product.quantity) <= 0
      ) {
        throw new CustomError(
          `Entrez une quantité positive valide pour le produit ${product.name}`,
          400
        );
      }
      if (
        !product.buying ||
        isNaN(product.buying) ||
        Number(product.buying) <= 0 ||
        !product.selling ||
        isNaN(product.selling) ||
        Number(product.selling) <= 0
      ) {
        throw new CustomError(
          `Saisissez un prix d'achat et de vente positif valide pour le produit ${product.name}`,
          400
        );
      }

      if (Number(product.buying) > Number(product.selling)) {
        throw new CustomError(
          `Le prix de vente doit être supérieur au prix d'achat du produit ${product.name}`,
          400
        );
      }

      const newQuantity = Number(product.quantity);
      return {
        ...product,
        newQuantity,
      };
    });

    const productDetails = await Promise.all(productTasks);
    // Calculate totalAmount after resolving all promises
    const totalAmount = productDetails.reduce(
      (acc, product) => acc + product.buying * product.newQuantity,
      0
    );
    if (Number(totalAmount) != Number(amount)) {
      throw new CustomError(
        "Le montant total ne correspond pas à la somme des produits",
        400
      );
    }
    // Set to UTC time zone
    const currentDateTime = moment.getCurrentDateTime(); // Ensures UTC+1
    let newSousPurchse = [];
    for (const product of productDetails) {
      const stock = await StockService.findStockByStoreAndProduct(
        store,
        product.productID
      );
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
          throw new CustomError(
            "Erreur lors de la création du statut du stock, réessayez.",
            400
          );
        }

        stock.quantity += product.newQuantity;
        stock.buying = product.buying;
        stock.selling = product.selling;
        const updatedStock = await stock.save({ session });
        if (!updatedStock) {
          throw new CustomError(
            "Erreur lors de la mise à jour du stock, réessayez.",
            400
          );
        }

        //add stock status id to sous newSousPurchse array of objects
        newSousPurchse.push({
          sousStock: stockStatus[0]._id,
          quantity: product.newQuantity,
          price: product.buying,
        });
      } else {
        // Create new stock and stock status if it doesn't exist
        const newStock = await StockService.createNewStock(
          product,
          store,
          session
        );
        if (!newStock) {
          throw new CustomError(
            "Erreur lors de la création du stock, réessayez.",
            400
          );
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
          throw new CustomError(
            "Erreur lors de la création du statut du stock, réessayez.",
            400
          );
        }
        //add stock status id to sous newSousPurchse array of objects
        newSousPurchse.push({
          sousStock: stockStatus[0]._id,
          quantity: product.newQuantity,
          price: product.buying,
        });
      }
    }

    //check if newSousPurchse is empty
    if (
      newSousPurchse.length < 1 ||
      newSousPurchse.length != productDetails.length
    ) {
      throw new CustomError(
        "Erreur lors de la création du statut du stock, réessayez.",
        400
      );
    }

    // Create a new Purchase status
    const newSousPurchase = await SousPurchaseService.createSousPurchase(
      newSousPurchse,
      currentDateTime,
      session
    );
    //check if new status was created
    if (!newSousPurchase || !newSousPurchase[0]) {
      await session.abortTransaction();
      session.endSession();
      return next(
        new CustomError(
          "Erreur lors de la création d'un nouveau statut d'achat, réessayez.",
          400
        )
      );
    }

    const totalAmountwithDiscount =
      Number(Discount) > 0
        ? Number(totalAmount) - Number(Discount)
        : totalAmount;

    // Create new Purchase
    const newPurchase = await Purchase.create(
      [
        {
          store: store,
          fournisseur: fournisseur,
          date: currentDateTime,
          totalAmount: totalAmountwithDiscount,
          credit: false,
          closed: false,
          deposit: false,
          sousPurchases: [newSousPurchase[0]._id],
          discount: Discount,
        },
      ],
      { session }
    );

    if (!newPurchase) {
      throw new CustomError(
        "Erreur lors de la création de l'achat, réessayez.",
        400
      );
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: "Achat créé avec succès" });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return next(err);
  }
});

//fetch all Purchases
const GetPurchaseByID = asyncErrorHandler(async (req, res, next) => {
  const { id, store } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    const err = new CustomError("Tous les champs sont obligatoires", 400);
    return next(err);
  }

  //get all purchases by store
  const purchase = await Purchase.findOne({
    _id: id,
    store: store,
  })
    .populate({
      path: "fournisseur",
      select: "firstName lastName phoneNumber address wilaya commune",
    })
    .populate({
      path: "sousPurchases",
      select: "sousStocks",
      populate: {
        path: "sousStocks.sousStock",
        select: "stock buying quantity",
        populate: {
          path: "stock",
          select: "product",
          populate: {
            path: "product",
            select: "name size brand boxItems image",
            populate: {
              path: "brand",
              select: "name",
            },
          },
        },
      },
    });

  // Check if the purchase exists
  if (!purchase) {
    return next(new CustomError("Achat non trouvé", 404));
  }

  // Convert purchase to a plain object to make modifications
  const purchaseObj = purchase.toObject();

  // Fetch wilaya and commune details
  if (purchaseObj.fournisseur.wilaya && purchaseObj.fournisseur.commune) {
    const cities = await CitiesService.findCitiesFRByCodeC(
      purchaseObj.fournisseur.wilaya,
      purchaseObj.fournisseur.commune
    );

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
  const { 
    page = 1, 
    limit = 15, 
    search = '', 
    startDate = '', 
    endDate = '' 
  } = req.query;

  // Validate pagination parameters
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  // Build the base query
  let query = {
    store: store,
    closed: true,
  };

  // Add date range filtering if provided
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    query.createdAt = {
      $gte: start,
      $lte: end
    };
  } else if (startDate) {
    const start = new Date(startDate);
    query.createdAt = { $gte: start };
  } else if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    query.createdAt = { $lte: end };
  }

  //get all purchases by store
  const allPurchases = await Purchase.find(query)
    .populate({
      path: "fournisseur",
      select: "firstName lastName",
    })
    .sort({ createdAt: -1 });

    
  //check if purchases found
  const totalCount = allPurchases.length;
  if (totalCount <= 0) {
    const err = new CustomError("Aucun achat trouvé", 400);
    return next(err);
  }

  // Apply client-side search filtering if search term is provided
  let filteredPurchases = allPurchases;
  if (search && search.trim() !== '') {
    const searchRegex = new RegExp(search.trim(), 'i');
    filteredPurchases = allPurchases.filter(purchase => {
      if (!purchase.fournisseur) return false;
      
      const firstName = purchase.fournisseur.firstName || '';
      const lastName = purchase.fournisseur.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();
      const totalAmount = purchase.totalAmount || 0;

      return searchRegex.test(firstName) || 
             searchRegex.test(lastName) || 
             searchRegex.test(fullName) || 
             searchRegex.test(totalAmount.toString());
    });
  }

  // Apply pagination to filtered results
  const paginatedPurchases = filteredPurchases.slice(skip, skip + limitNum);

  // For each purchase, fetch the last sous purchase
  for (let i = 0; i < paginatedPurchases.length; i++) {
    let purchase = paginatedPurchases[i];

    if (purchase.sousPurchases && purchase.sousPurchases.length > 0) {
      const lastSousPurchase =
        await SousPurchaseService.findLastSousPurchaseByPurchasePopulated(
          purchase.sousPurchases[purchase.sousPurchases.length - 1]
        );

      if (!lastSousPurchase) {
        return next(new CustomError("Sous-achat non trouvé", 404));
      }

      paginatedPurchases[i] = {
        ...purchase.toObject(),
        sousPurchases: lastSousPurchase.sousStocks,
      };
    } else {
      const err = new CustomError(
        "Aucun sous-achat trouvé pour cet achat",
        400
      );
      return next(err);
    }
  }

  res.status(200).json({
    success: true,
    data: paginatedPurchases,
    pagination: {
      current_page: pageNum,
      total_pages: Math.ceil(totalCount / limitNum),
      total_items: totalCount,
      items_per_page: limitNum,
      has_next_page: pageNum < Math.ceil(totalCount / limitNum),
      has_prev_page: pageNum > 1
    },
    filters: {
      search: search,
      startDate: startDate,
      endDate: endDate
    }
  });
});

//fetch all credited Purchases with pagination, search, and date filtering
const GetAllCreditedPurchases = asyncErrorHandler(async (req, res, next) => {
  const { store } = req.params;
  const { 
    page = 1, 
    limit = 15, 
    search = '', 
    startDate = '', 
    endDate = '' 
  } = req.query;

  // Validate pagination parameters
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  // Build the base query
  let query = {
    store: store,
    $or: [{ credit: true }, { deposit: true }],
    closed: false,
  };

  // Add date range filtering if provided
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    query.createdAt = {
      $gte: start,
      $lte: end
    };
  } else if (startDate) {
    const start = new Date(startDate);
    query.createdAt = { $gte: start };
  } else if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    query.createdAt = { $lte: end };
  }

  //get all purchases by store
  const allPurchases = await Purchase.find(query)
    .populate({
      path: "fournisseur",
      select: "firstName lastName",
    })
    .sort({ createdAt: -1 });

  //check if purchases found
  const totalCount = allPurchases.length;
  if (totalCount <= 0) {
    const err = new CustomError("Aucun achat trouvé", 400);
    return next(err);
  }

  // Get total price for all purchases
  const totalPrice = allPurchases.reduce((acc, purchase) => acc + (purchase.totalAmount || 0), 0);

  // Apply client-side search filtering if search term is provided
  let filteredPurchases = allPurchases;
  if (search && search.trim() !== '') {
    const searchRegex = new RegExp(search.trim(), 'i');
    filteredPurchases = allPurchases.filter(purchase => {
      if (!purchase.fournisseur) return false;
      
      const firstName = purchase.fournisseur.firstName || '';
      const lastName = purchase.fournisseur.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();
      const totalAmount = purchase.totalAmount || 0;

      return searchRegex.test(firstName) || 
             searchRegex.test(lastName) || 
             searchRegex.test(fullName) || 
             searchRegex.test(totalAmount.toString());
    });
  }

  // Apply pagination to filtered results
  const paginatedPurchases = filteredPurchases.slice(skip, skip + limitNum);

  // For each purchase, fetch the last sous purchase
  for (let i = 0; i < paginatedPurchases.length; i++) {
    let purchase = paginatedPurchases[i];

    if (purchase.sousPurchases && purchase.sousPurchases.length > 0) {
      const lastSousPurchase =
        await SousPurchaseService.findLastSousPurchaseByPurchasePopulated(
          purchase.sousPurchases[purchase.sousPurchases.length - 1]
        );

      if (!lastSousPurchase) {
        return next(new CustomError("Sous-achat non trouvé", 404));
      }

      paginatedPurchases[i] = {
        ...purchase.toObject(),
        sousPurchases: lastSousPurchase.sousStocks,
      };
    } else {
      const err = new CustomError(
        "Aucun sous-achat trouvé pour cet achat",
        400
      );
      return next(err);
    }
  }

  res.status(200).json({
    success: true,
    data: paginatedPurchases,
    pagination: {
      current_page: pageNum,
      total_pages: Math.ceil(totalCount / limitNum),
      total_items: totalCount,
      total_price: totalPrice,
      items_per_page: limitNum,
      has_next_page: pageNum < Math.ceil(totalCount / limitNum),
      has_prev_page: pageNum > 1
    },
    filters: {
      search: search,
      startDate: startDate,
      endDate: endDate
    }
  });
});

//fetch all returned Purchases with pagination, search, and date filtering
const GetAllReturnedPurchases = asyncErrorHandler(async (req, res, next) => {
  const { store } = req.params;
  const { 
    page = 1, 
    limit = 15, 
    search = '', 
    startDate = '', 
    endDate = '' 
  } = req.query;

  // Validate pagination parameters
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  // Build the base query
  let query = {
    store: store,
    sousPurchases: { $exists: true },
    $expr: { $gt: [{ $size: "$sousPurchases" }, 1] },
  };

  // Add date range filtering if provided
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    query.createdAt = {
      $gte: start,
      $lte: end
    };
  } else if (startDate) {
    const start = new Date(startDate);
    query.createdAt = { $gte: start };
  } else if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    query.createdAt = { $lte: end };
  }

  //get all purchases by store
  const allPurchases = await Purchase.find(query)
    .populate({
      path: "fournisseur",
      select: "firstName lastName",
    })
    .sort({ createdAt: -1 });

  //check if purchases found
  const totalCount = allPurchases.length;
  if (totalCount <= 0) {
    const err = new CustomError("Aucun achat retourné trouvé", 400);
    return next(err);
  }

  // Get total price for all purchases
  const totalPrice = allPurchases.reduce((acc, purchase) => acc + (purchase.totalAmount || 0), 0);

  // Apply client-side search filtering if search term is provided
  let filteredPurchases = allPurchases;
  if (search && search.trim() !== '') {
    const searchRegex = new RegExp(search.trim(), 'i');
    filteredPurchases = allPurchases.filter(purchase => {
      if (!purchase.fournisseur) return false;
      
      const firstName = purchase.fournisseur.firstName || '';
      const lastName = purchase.fournisseur.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();
      const totalAmount = purchase.totalAmount || 0;

      return searchRegex.test(firstName) || 
             searchRegex.test(lastName) || 
             searchRegex.test(fullName) || 
             searchRegex.test(totalAmount.toString());
    });
  }

  // Apply pagination to filtered results
  const paginatedPurchases = filteredPurchases.slice(skip, skip + limitNum);

  // For each purchase, fetch the last sous purchase
  for (let i = 0; i < paginatedPurchases.length; i++) {
    let purchase = paginatedPurchases[i];

    if (purchase.sousPurchases && purchase.sousPurchases.length > 0) {
      const lastSousPurchase =
        await SousPurchaseService.findLastSousPurchaseByPurchasePopulated(
          purchase.sousPurchases[purchase.sousPurchases.length - 1]
        );

      if (!lastSousPurchase) {
        return next(new CustomError("Sous-achat non trouvé", 404));
      }

      paginatedPurchases[i] = {
        ...purchase.toObject(),
        sousPurchases: lastSousPurchase.sousStocks,
      };
    } else {
      const err = new CustomError(
        "Aucun sous-achat trouvé pour cet achat",
        400
      );
      return next(err);
    }
  }

  res.status(200).json({
    success: true,
    data: paginatedPurchases,
    pagination: {
      current_page: pageNum,
      total_pages: Math.ceil(totalCount / limitNum),
      total_items: totalCount,
      total_price: totalPrice,
      items_per_page: limitNum,
      has_next_page: pageNum < Math.ceil(totalCount / limitNum),
      has_prev_page: pageNum > 1
    },
    filters: {
      search: search,
      startDate: startDate,
      endDate: endDate
    }
  });
});

//fetch all new Purchases with pagination, search, and date filtering
const GetAllNewPurchases = asyncErrorHandler(async (req, res, next) => {
  const { store } = req.params;
  const { 
    page = 1, 
    limit = 15, 
    search = '', 
    startDate = '', 
    endDate = '' 
  } = req.query;

  // Validate pagination parameters
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  // Build the base query
  let query = {
    store: store,
    credit: false,
    deposit: false,
    closed: false,
    payment: { $size: 0 },
  };

  // Add date range filtering if provided
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    query.createdAt = {
      $gte: start,
      $lte: end
    };
  } else if (startDate) {
    const start = new Date(startDate);
    query.createdAt = { $gte: start };
  } else if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    query.createdAt = { $lte: end };
  }

  //get all purchases by store
  const allPurchases = await Purchase.find(query)
    .populate({
      path: "fournisseur",
      select: "firstName lastName",
    })
    .sort({ createdAt: -1 });

  //check if purchases found
  const totalCount = allPurchases.length;
  if (totalCount <= 0) {
    const err = new CustomError("Aucun achat trouvé", 400);
    return next(err);
  }

  // Get total price for all purchases
  const totalPrice = allPurchases.reduce((acc, purchase) => acc + (purchase.totalAmount || 0), 0);

  // Apply client-side search filtering if search term is provided
  let filteredPurchases = allPurchases;
  if (search && search.trim() !== '') {
    const searchRegex = new RegExp(search.trim(), 'i');
    filteredPurchases = allPurchases.filter(purchase => {
      if (!purchase.fournisseur) return false;
      
      const firstName = purchase.fournisseur.firstName || '';
      const lastName = purchase.fournisseur.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();
      const totalAmount = purchase.totalAmount || 0;

      return searchRegex.test(firstName) || 
             searchRegex.test(lastName) || 
             searchRegex.test(fullName) || 
             searchRegex.test(totalAmount.toString());
    });
  }

  // Apply pagination to filtered results
  const paginatedPurchases = filteredPurchases.slice(skip, skip + limitNum);

  // For each purchase, fetch the last sous purchase
  for (let i = 0; i < paginatedPurchases.length; i++) {
    let purchase = paginatedPurchases[i];

    if (purchase.sousPurchases && purchase.sousPurchases.length > 0) {
      const lastSousPurchase =
        await SousPurchaseService.findLastSousPurchaseByPurchasePopulated(
          purchase.sousPurchases[purchase.sousPurchases.length - 1]
        );

      if (!lastSousPurchase) {
        return next(new CustomError("Sous-achat non trouvé", 404));
      }

      paginatedPurchases[i] = {
        ...purchase.toObject(),
        sousPurchases: lastSousPurchase.sousStocks,
      };
    } else {
      const err = new CustomError(
        "Aucun sous-achat trouvé pour cet achat",
        400
      );
      return next(err);
    }
  }

  res.status(200).json({
    success: true,
    data: paginatedPurchases,
    pagination: {
      current_page: pageNum,
      total_pages: Math.ceil(totalCount / limitNum),
      total_items: totalCount,
      total_price: totalPrice,
      items_per_page: limitNum,
      has_next_page: pageNum < Math.ceil(totalCount / limitNum),
      has_prev_page: pageNum > 1
    },
    filters: {
      search: search,
      startDate: startDate,
      endDate: endDate
    }
  });
});

//fetch all purchases by fournisseur with pagination, search, and date filtering
const GetAllPurchasesByFournisseurForSpecificStore = asyncErrorHandler(async (req, res, next) => {
  const { store, fournisseur } = req.params;
  const { 
    page = 1, 
    limit = 15, 
    search = '', 
    startDate = '', 
    endDate = '' 
  } = req.query;

  if (!fournisseur || !mongoose.Types.ObjectId.isValid(fournisseur)) {
    const err = new CustomError("Tous les champs sont obligatoires", 400);
    return next(err);
  }

  //check if the fournisseur exist
  const existFournisseur = await FournisseurService.findFournisseurByIdANDStore(fournisseur, store);
  if (!existFournisseur) {
    const err = new CustomError("Fournisseur non trouvé", 404);
    return next(err);
  }

  // Validate pagination parameters
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  // Build the base query
  let query = {
    store: store,
    fournisseur: fournisseur,
  };

  // Add date range filtering if provided
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    query.createdAt = {
      $gte: start,
      $lte: end
    };
  } else if (startDate) {
    const start = new Date(startDate);
    query.createdAt = { $gte: start };
  } else if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    query.createdAt = { $lte: end };
  }

  //get all purchases by store and fournisseur
  const allPurchases = await Purchase.find(query).sort({ createdAt: -1 });
    
  //check if purchases found
  const totalCount = allPurchases.length;
  if (totalCount <= 0) {
    const err = new CustomError("Aucun achat trouvé", 400);
    return next(err);
  }

  // Apply client-side search filtering if search term is provided
  let filteredPurchases = allPurchases;
  if (search && search.trim() !== '') {
    const searchRegex = new RegExp(search.trim(), 'i');
    filteredPurchases = allPurchases.filter(purchase => {
      const totalAmount = purchase.totalAmount || 0;
      const date = purchase.date || '';

      return searchRegex.test(totalAmount.toString()) || 
              searchRegex.test(date);
    });
  }

  // Apply pagination to filtered results
  const paginatedPurchases = filteredPurchases.slice(skip, skip + limitNum);

  // For each purchase, fetch the last sous purchase
  for (let i = 0; i < paginatedPurchases.length; i++) {
    let purchase = paginatedPurchases[i];

    if (purchase.sousPurchases && purchase.sousPurchases.length > 0) {
      const lastSousPurchase =
        await SousPurchaseService.findLastSousPurchaseByPurchasePopulated(
          purchase.sousPurchases[purchase.sousPurchases.length - 1]
        );

      if (!lastSousPurchase) {
        return next(new CustomError("Sous-achat non trouvé", 404));
      }

      paginatedPurchases[i] = {
        ...purchase.toObject(),
        sousPurchases: lastSousPurchase.sousStocks,
      };
    } else {
      const err = new CustomError(
        "Aucun sous-achat trouvé pour cet achat",
        400
      );
      return next(err);
    }
  }

  //return the purchases
  res.status(200).json({
    success: true,
    data: paginatedPurchases,
    pagination: {
      current_page: pageNum,
      total_pages: Math.ceil(totalCount / limitNum),
      total_items: totalCount,
      items_per_page: limitNum,
      has_next_page: pageNum < Math.ceil(totalCount / limitNum),
      has_prev_page: pageNum > 1
    },
    filters: {
      search: search,
      startDate: startDate,
      endDate: endDate
    }
  });
});

//update Purchase Credit
const UpdatePurchaseCredited = asyncErrorHandler(async (req, res, next) => {
  const { id } = req.params;
  const { credited, store } = req.body;
  if (
    !id ||
    !store ||
    !mongoose.Types.ObjectId.isValid(id) ||
    !mongoose.Types.ObjectId.isValid(store)
  ) {
    const err = new CustomError("Tous les champs sont obligatoires", 400);
    return next(err);
  }
  if (!validator.isBoolean(credited.toString())) {
    const err = new CustomError("Entrez une valeur valide", 400);
    return next(err);
  }

  //check if the purchase exist
  const existPurchase = await PurchaseService.findPurchaseByIdAndStore(
    id,
    store
  );
  if (!existPurchase) {
    const err = new CustomError("Achat non trouvé", 404);
    return next(err);
  }

  //update
  if (credited === false) {
    // Clear the payment array first
    existPurchase.payment = [];
  }
  existPurchase.credit = credited;

  // Update Purchase
  const updatedPurchase = await existPurchase.save();

  // Check if Purchase updated successfully
  if (!updatedPurchase) {
    const err = new CustomError(
      "Erreur lors de la mise à jour de l'achat, réessayez.",
      400
    );
    return next(err);
  }

  res
    .status(200)
    .json({ message: `L'achat maintenant est ${credited ? "" : "n'est pas "}crédité` });
});

//update Purchase Deposit
const UpdatePurchaseDeposit = asyncErrorHandler(async (req, res, next) => {
  const { id } = req.params;
  const { deposit, store } = req.body;
  if (
    !id ||
    !store ||
    !mongoose.Types.ObjectId.isValid(id) ||
    !mongoose.Types.ObjectId.isValid(store)
  ) {
    const err = new CustomError("Tous les champs sont obligatoires", 400);
    return next(err);
  }
  if (!validator.isBoolean(deposit.toString())) {
    const err = new CustomError("Entrez une valeur valide", 400);
    return next(err);
  }

  //check if the purchase exist
  const existPurchase = await PurchaseService.findPurchaseByIdAndStore(
    id,
    store
  );
  if (!existPurchase) {
    const err = new CustomError("Achat non trouvé", 404);
    return next(err);
  }

  //update
  existPurchase.deposit = deposit;

  // Update Purchase
  const updatedPurchase = await existPurchase.save();

  // Check if Purchase updated successfully
  if (!updatedPurchase) {
    const err = new CustomError(
      "Erreur lors de la mise à jour de l'achat, réessayez.",
      400
    );
    return next(err);
  }

  res
    .status(200)
    .json({ message: `L'achat maintenant est ${deposit ? "" : "n'est pas "}deposit` });
});

//add payment to purchase
const AddPaymentToPurchase = asyncErrorHandler(async (req, res, next) => {
  const { id } = req.params;
  const { amount, store } = req.body;

  // Get current date with Algiers timezone
  const currentDateTime = moment.getCurrentDateTime(); // Ensures UTC+1

  // Validate ID
  if (
    !id ||
    !store ||
    !mongoose.Types.ObjectId.isValid(id) ||
    !mongoose.Types.ObjectId.isValid(store)
  ) {
    const err = new CustomError("Tous les champs sont obligatoires", 400);
    return next(err);
  }

  // Check if the amount is valid
  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    const err = new CustomError("Entrez un montant positif validet", 400);
    return next(err);
  }

  // Find the existing purchase
  const existPurchase = await Purchase.findOne({
    _id: id,
    store: store,
  });
  if (!existPurchase) {
    const err = new CustomError("Achat non trouvé", 404);
    return next(err);
  }

  //check if the purchase is closed
  if (existPurchase.closed) {
    const err = new CustomError(
      "Votre achat est clôturé une fois tout payé.",
      400
    );
    return next(err);
  }

  //check if the purchase is credited
  if (existPurchase.credit == false) {
    const err = new CustomError(
      "Vous ne pouvez pas ajouter de paiement car cet achat n'est pas crédité",
      400
    );
    return next(err);
  }

  // Check if the total amount and sum of existing payments are considered
  const totalPayments = existPurchase.payment.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );
  if (totalPayments + Number(amount) > Number(existPurchase.totalAmount)) {
    const err = new CustomError(
      "Le montant du paiement dépasse le montant total dû",
      400
    );
    return next(err);
  }
  if (totalPayments + Number(amount) == Number(existPurchase.totalAmount)) {
    existPurchase.closed = true;
  }

  // Add the payment to the purchase
  existPurchase.payment.push({
    date: currentDateTime,
    amount: Number(amount),
  });

  // Save the updated purchase
  const updatedPurchase = await existPurchase.save();

  // Check if the purchase was updated successfully
  if (!updatedPurchase) {
    const err = new CustomError(
      "Erreur lors de l'ajout d'un nouveau paiement, réessayez.",
      400
    );
    return next(err);
  }

  res.status(200).json({ message: "Paiement ajouté avec succès" });
});

//delete payment from purchase
const DeletePaymentFromPurchase = asyncErrorHandler(async (req, res, next) => {
  const { id, paymentId, store } = req.params;
  if (
    !id ||
    !paymentId ||
    !mongoose.Types.ObjectId.isValid(id) ||
    !mongoose.Types.ObjectId.isValid(paymentId)
  ) {
    const err = new CustomError("Tous les champs sont obligatoires", 400);
    return next(err);
  }

  // Find the existing purchase
  const existPurchase = await Purchase.findOne({
    _id: id,
    store: store,
  });
  if (!existPurchase) {
    const err = new CustomError("Achat non trouvé", 404);
    return next(err);
  }

  //check if the purchase is closed
  if (existPurchase.closed) {
    const err = new CustomError("Votre achat est déjà clôturé", 400);
    return next(err);
  }

  //check if the purchase is credited
  if (existPurchase.credit == false) {
    const err = new CustomError(
      "Vous ne pouvez pas supprimer le paiement car cet achat n'est pas crédité",
      400
    );
    return next(err);
  }

  // Check if the payment exists
  const paymentIndex = existPurchase.payment.findIndex(
    (p) => p._id.toString() == paymentId
  );
  if (paymentIndex === -1) {
    const err = new CustomError("Paiement non trouvé", 404);
    return next(err);
  }

  // Remove the payment from the purchase
  existPurchase.payment.splice(paymentIndex, 1);

  // Save the updated purchase
  const updatedPurchase = await existPurchase.save();

  // Check if the purchase was updated successfully
  if (!updatedPurchase) {
    const err = new CustomError(
      "Erreur lors de la suppression du paiement, réessayez.",
      400
    );
    return next(err);
  }

  res.status(200).json({ message: "Paiement supprimé avec succès" });
});

//add payments to purchase
const AddFullPaymentToPurchase = asyncErrorHandler(async (req, res, next) => {
  const { id } = req.params;
  const { store } = req.body;

  // Get current date with Algiers timezone
  const currentDateTime = moment.getCurrentDateTime(); // Ensures UTC+1

  // Validate ID
  if (
    !id ||
    !store ||
    !mongoose.Types.ObjectId.isValid(id) ||
    !mongoose.Types.ObjectId.isValid(store)
  ) {
    const err = new CustomError("Tous les champs sont obligatoires", 400);
    return next(err);
  }

  // Find the existing purchase
  const existPurchase = await Purchase.findOne({
    _id: id,
    store: store,
  });
  if (!existPurchase) {
    const err = new CustomError("Achat non trouvé", 404);
    return next(err);
  }

  //check if the purchase is closed
  if (existPurchase.closed) {
    const err = new CustomError("Votre achat est déjà clôturé", 400);
    return next(err);
  }

  //check if the purchase is credited
  if (existPurchase.credit == true) {
    const err = new CustomError(
      "Vous ne pouvez pas ajouter le paiement complet car cet achat est crédité",
      400
    );
    return next(err);
  }

  // Clear the payment array first
  existPurchase.payment = [];
  // Add the payment to the purchase
  existPurchase.payment.push({
    date: currentDateTime,
    amount: Number(existPurchase.totalAmount),
  });
  existPurchase.closed = true;
  existPurchase.deposit = false;
  existPurchase.credit = false;

  // Save the updated purchase
  const updatedPurchase = await existPurchase.save();

  // Check if the purchase was updated successfully
  if (!updatedPurchase) {
    const err = new CustomError(
      "Erreur lors de l'ajout d'un paiement complet, réessayez.",
      400
    );
    return next(err);
  }

  res.status(200).json({ message: "Paiement intégral ajouté avec succès" });
});

//add payments to purchases starting from the oldest
const ProcessPaymentsStartingWithOldest = asyncErrorHandler(
  async (req, res, next) => {
    const { store } = req.params;
    const { fournisseurId, amount } = req.body;
    // Validate fournisseur ID
    if (!fournisseurId || !mongoose.Types.ObjectId.isValid(fournisseurId)) {
      return next(new CustomError("ID de fournisseur non valide fourni.", 400));
    }
    // Validate amount
    if (isNaN(Number(amount)) || Number(amount) <= 0) {
      return next(new CustomError("Entrez un montant positif valide", 400));
    }

    const existingPurchases = await Purchase.find({
      store,
      fournisseur: fournisseurId,
      closed: false,
    }).sort({ createdAt: 1 });

    if (existingPurchases.length <= 0) {
      return next(new CustomError("Aucun achat trouvé", 400));
    }

    const currentDateTime = moment.getCurrentDateTime();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let remainingAmount = Number(amount);
      const purchasesToUpdate = [];

      for (const purchase of existingPurchases) {
        if (remainingAmount <= 0) break;

        const totalPayments = purchase.payment.reduce(
          (sum, p) => sum + p.amount,
          0
        );
        const dueAmount = purchase.totalAmount - totalPayments;

        if (dueAmount > 0) {
          const paymentAmount = Math.min(dueAmount, remainingAmount);
          remainingAmount -= paymentAmount;

          //check if paymentAmount is equal to the purchase total amount if purchase is not credited
          if (purchase.credit == false && paymentAmount != dueAmount) {
            //skip this purchase
            continue;
          }

          purchase.payment.push({
            date: currentDateTime,
            amount: paymentAmount,
          });
          if (totalPayments + paymentAmount === purchase.totalAmount) {
            purchase.closed = true;
          }
          purchasesToUpdate.push(purchase);
        }
      }

      if (purchasesToUpdate.length <= 0) {
        return next(
          new CustomError(
            "Aucun achat n'est disponible pour les paiements ou il s'agit uniquement d'achats non crédités et vous devez mettre le montant total",
            400
          )
        );
      }
      await Purchase.bulkSave(purchasesToUpdate, { session });

      await session.commitTransaction();
      res.status(200).json({ message: "Paiements ajoutés avec succès" });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      return next(
        new CustomError("Erreur lors de l'ajout des paiements, réessayez.", 400)
      );
    }
  }
);

//get statistics purchase for specific store and fournisseur
const GetStatisticsForStoreFournisseur = asyncErrorHandler(
  async (req, res, next) => {
    const { store, fournisseur } = req.params;

    // Validate store and fournisseur IDs
    if (!fournisseur || !mongoose.Types.ObjectId.isValid(fournisseur)) {
      return next(new CustomError("ID de fournisseur non valide fourni.", 400));
    }

    // Check if the fournisseur exists for the given store
    const existFournisseur =
      await FournisseurService.findFournisseurByIdANDStore(fournisseur, store);
    if (!existFournisseur) {
      return next(new CustomError("Fournisseur non trouvé", 404));
    }

    // Get statistics for purchases between the store and fournisseur
    const totalPurchases =
      await PurchaseService.countPurchasesByStoreAndFournisseur(
        store,
        fournisseur
      );
    const totalAmount = await PurchaseService.sumAmountsForAllPurchases(
      store,
      fournisseur
    );
    const totalPayment = await PurchaseService.sumPaymentsForAllPurchases(
      store,
      fournisseur
    );
    const totalCreditUnpaid =
      await PurchaseService.sumPaymentsForCreditedUnpaidPurchases(
        store,
        fournisseur
      );

    // Respond with the statistics
    res.status(200).json({
      count: totalPurchases,
      totalAmount: totalAmount,
      totalPayment: totalPayment,
      totalCreditUnpaid: totalCreditUnpaid,
    });
  }
);

module.exports = {
  CreatePurchase,
  GetAllClosedPurchases,
  GetPurchaseByID,
  GetAllCreditedPurchases,
  GetAllReturnedPurchases,
  GetAllNewPurchases,
  GetAllPurchasesByFournisseurForSpecificStore,
  UpdatePurchaseCredited,
  UpdatePurchaseDeposit,
  AddPaymentToPurchase,
  AddFullPaymentToPurchase,
  ProcessPaymentsStartingWithOldest,
  DeletePaymentFromPurchase,
  GetStatisticsForStoreFournisseur,
};
