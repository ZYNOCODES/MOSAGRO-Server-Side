const express = require('express');
const {
    GetAllPublicitybyStore,
    AddPublicity,
    RemovePublicity,
    GetAllPublicPublicities,
    ChangePublicityDistination
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
//fetch all public Publicities
router.get('/', GetAllPublicPublicities);
//update Publicity distination
router.patch('/distination/:id', ChangePublicityDistination);

module.exports = router;