const express = require('express');
const {
    CreatePurchase,
    GetAllPurchases,
    GetPurchaseByID,
    GetAllCreditedPurchases,
    GetAllNewPurchases,
    GetAllPurchasesByFournisseurForSpecificStore,
    UpdatePurchase,
    AddPaymentToPurchase,
    DeletePurchase
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
router.get('/:id', checkAuthrozation([process.env.STORE_TYPE]), GetPurchaseByID);
//get all Purchases non credited by store
router.get('/all/:store', checkAuthrozation([process.env.STORE_TYPE]), GetAllPurchases);
//get all Purchases credited by store
router.get('/all/credited/:store', checkAuthrozation([process.env.STORE_TYPE]), GetAllCreditedPurchases);
//get all new Purchases by store
router.get('/all/new/:store', checkAuthrozation([process.env.STORE_TYPE]), GetAllNewPurchases);
//get all Purchases by fournisseur for specific store
router.get('/all/:store/:fournisseur', checkAuthrozation([process.env.STORE_TYPE]), GetAllPurchasesByFournisseurForSpecificStore);
//update a specific Purchase
router.patch('/:id', checkAuthrozation([process.env.STORE_TYPE]), UpdatePurchase);
//add payment to a specific purchase
router.patch('/payment/:id', checkAuthrozation([process.env.STORE_TYPE]), AddPaymentToPurchase);
//delete a specific purchase
router.delete('/:id', checkAuthrozation([process.env.STORE_TYPE]), DeletePurchase);

module.exports = router;