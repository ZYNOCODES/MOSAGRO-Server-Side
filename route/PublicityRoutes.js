const express = require('express');
const {
    GetAllPublicitybyStore,
    AddPublicity,
    RemovePublicity
} = require('../controller/PublicityController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');

//secure routes below
router.use(requireAuth);
//fetch all Publicity
router.get('/:id', GetAllPublicitybyStore);
//add Publicity
router.post('/', AddPublicity);
//remove Publicity
router.patch('/:id', RemovePublicity);

module.exports = router;