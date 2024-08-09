const express = require('express');
const {
    GetAllCitiesAR,
    GetAllCitiesFR,
} = require('../controller/CitiesController');
const router = express.Router();

// SHARED_API routes below
//get all arabic cities
router.get('/ar', GetAllCitiesAR);
//get all french cities
router.get('/fr', GetAllCitiesFR);

module.exports = router;