const express = require('express');
const {
    CreatePurchase,
    GetAllClosedPurchases,
    GetPurchaseByID,
    GetAllCreditedPurchases,
    GetAllNewPurchases,
    GetAllPurchasesByFournisseurForSpecificStore,
    UpdatePurchaseCredited,
    UpdatePurchaseDeposit,
    AddPaymentToPurchase,
    AddFullPaymentToPurchase,
    DeletePurchase,
    GetStatisticsForStoreFournisseur
} = require('../controller/PurchaseController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');

//secure routes below
router.use(requireAuth);

// STORE_API routes below
//create new Purchase by store
router.post('/create/:store', checkAuthrozation([process.env.STORE_TYPE]), CreatePurchase);
//get specific Purchase
router.get('/:id/:store', checkAuthrozation([process.env.STORE_TYPE]), GetPurchaseByID);
//get all Purchases non credited by store
router.get('/all/closed/:store', checkAuthrozation([process.env.STORE_TYPE]), GetAllClosedPurchases);
//get all Purchases credited by store
router.get('/all/credited/:store', checkAuthrozation([process.env.STORE_TYPE]), GetAllCreditedPurchases);
//get all new Purchases by store
router.get('/all/new/:store', checkAuthrozation([process.env.STORE_TYPE]), GetAllNewPurchases);
//get all Purchases by fournisseur for specific store
router.get('/all/:store/:fournisseur', checkAuthrozation([process.env.STORE_TYPE]), GetAllPurchasesByFournisseurForSpecificStore);
//update a specific Purchase credited
router.patch('/credit/:id', checkAuthrozation([process.env.STORE_TYPE]), UpdatePurchaseCredited);
//update a specific Purchase deposit
router.patch('/deposit/:id', checkAuthrozation([process.env.STORE_TYPE]), UpdatePurchaseDeposit);
//add payment to a specific purchase
router.patch('/payment/:id', checkAuthrozation([process.env.STORE_TYPE]), AddPaymentToPurchase);
//add payment to a specific purchase
router.patch('/full/payment/:id', checkAuthrozation([process.env.STORE_TYPE]), AddFullPaymentToPurchase);
//delete a specific purchase
router.delete('/:id/:store', checkAuthrozation([process.env.STORE_TYPE]), DeletePurchase);
// Getting statistics for a specific store and fournisseur
router.get('/statistics/:store/:fournisseur', checkAuthrozation([process.env.STORE_TYPE]), GetStatisticsForStoreFournisseur);

module.exports = router;