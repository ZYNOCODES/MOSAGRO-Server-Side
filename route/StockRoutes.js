const express = require('express');
const {
    CreateStock,
    FetchStockByStore,
    UpdateStock,
    DeleteStock
} = require('../controller/StockController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');

//secure routes below
router.use(requireAuth);
//create new stock
router.post('/create', CreateStock);
//fetch stock by store
router.get('/:Store', FetchStockByStore);
//update stock
router.patch('/update/:id', UpdateStock);
//delete stock
router.delete('/delete/:id', DeleteStock);

module.exports = router;