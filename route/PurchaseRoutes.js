const express = require('express');
const {
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
    GetStatisticsForStoreFournisseur
} = require('../controller/PurchaseController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');
const checkSubscription = require('../middleware/CheckSubscription');
const checkStoreOwnership = require('../middleware/CheckStoreOwnership');

//secure routes below
router.use(requireAuth);
router.use(checkSubscription);

// STORE_API routes below
//create new Purchase by store
router.post('/create/:store', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, CreatePurchase);
//get specific Purchase
router.get('/:id/:store', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, GetPurchaseByID);
//get all Purchases non credited by store
router.get('/all/closed/:store', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, GetAllClosedPurchases);
//get all Purchases credited by store
router.get('/all/credited/:store', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, GetAllCreditedPurchases);
//get all Purchases returned by store
router.get('/all/returned/:store', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, GetAllReturnedPurchases);
//get all new Purchases by store
router.get('/all/new/:store', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, GetAllNewPurchases);
//get all Purchases by fournisseur for specific store
router.get('/all/:store/:fournisseur', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, GetAllPurchasesByFournisseurForSpecificStore);
//update a specific Purchase credited
router.patch('/credit/:id', checkAuthrozation([process.env.STORE_TYPE]), UpdatePurchaseCredited);
//update a specific Purchase deposit
router.patch('/deposit/:id', checkAuthrozation([process.env.STORE_TYPE]), UpdatePurchaseDeposit);
//add payment to a specific purchase
router.patch('/payment/:id', checkAuthrozation([process.env.STORE_TYPE]), AddPaymentToPurchase);
//add payment to a specific purchase
router.patch('/full/payment/:id', checkAuthrozation([process.env.STORE_TYPE]), AddFullPaymentToPurchase);
//delete payment from a specific purchase
router.delete('/payment/:store/:id/:paymentId', checkAuthrozation([process.env.STORE_TYPE]), DeletePaymentFromPurchase);
//process payments starting with oldest
router.patch('/process/payments/:store', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, ProcessPaymentsStartingWithOldest);
// Getting statistics for a specific store and fournisseur
router.get('/statistics/:store/:fournisseur', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, GetStatisticsForStoreFournisseur);

module.exports = router;