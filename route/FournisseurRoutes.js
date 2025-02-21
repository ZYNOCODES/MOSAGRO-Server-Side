const express = require('express');
const {
    CreateFournisseur,
    GetFournisseurByID,
    GetAllFournisseurs,
    UpdateFournisseur,
    DeleteFournisseur
} = require('../controller/FournisseurController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');
const checkSubscription = require('../middleware/CheckSubscription');

//secure routes below
router.use(requireAuth);
router.use(checkSubscription);

// STORE_API routes below
//get specific fournisseur
router.get('/one/:id', checkAuthrozation([process.env.STORE_TYPE]), GetFournisseurByID);
//get all fournisseur
router.get('/:store', checkAuthrozation([process.env.STORE_TYPE]), GetAllFournisseurs);
//create new fournisseur
router.post('/create/:store', checkAuthrozation([process.env.STORE_TYPE]), CreateFournisseur);
//update a fournisseur
router.patch('/:store', checkAuthrozation([process.env.STORE_TYPE]), UpdateFournisseur);
//delete a fournisseur
router.delete('/:id', checkAuthrozation([process.env.STORE_TYPE]), DeleteFournisseur);

module.exports = router;