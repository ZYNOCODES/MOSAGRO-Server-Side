const express = require('express');
const {
    getTodayOrdersStatsByStore,
    getOrdersStatsByStore,
    getTopSellingStocksByStore,
    getStatsByStore,
    getLastNewAccessCustomersByStore,
    getStocksAboutToFinishByStore
} = require('../controller/DashboardController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');
const checkStoreOwnership = require('../middleware/CheckStoreOwnership');
const checkSubscription = require('../middleware/CheckSubscription');

//secure routes below
router.use(requireAuth);
router.use(checkSubscription);

// STORE_API routes below
// get today orders stats by store
router.get('/orders/today/:store', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, getTodayOrdersStatsByStore);
// get orders stats between two dates
router.get('/orders/stats/:store', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, getOrdersStatsByStore);
// get top Selling stocks by store
router.get('/top-selling-products/:store', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, getTopSellingStocksByStore);
// get stats by store
router.get('/stats/:store', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, getStatsByStore);
// get last new access customers by store
router.get('/last-new-access-customers/:store', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, getLastNewAccessCustomersByStore);
// get stocks about to finish by store
router.get('/stocks-about-to-finish/:store', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, getStocksAboutToFinishByStore);

module.exports = router;