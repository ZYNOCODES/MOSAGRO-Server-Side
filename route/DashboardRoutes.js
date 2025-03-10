const express = require('express');
const {
    getTodayOrdersStatsByStore,
    getOrdersStatsByStore,
    getTopSellingStocksByStore,
    getStatsByStore,
    getLastNewAccessCustomersByStore,
    getStocksAboutToFinishByStore,
    getTotalDailyByStore,
    getTotalWeeklyByStore,
    getTotalMonthlyByStore,
    getTotalYearlyByStore,
    getAllSubscriptionsStats,
    getSubscriptionsStats,
    getTotalDailySubscriptions,
    getTotalWeeklySubscriptions,
    getTotalMonthlySubscriptions,
    getTotalYearlySubscriptions,
    getStoreAccessRequests,
    getSubscriptionSoonToExpire,
    getStatsForAdmin
} = require('../controller/DashboardController');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkAuthrozation = require('../middleware/Authorization');
const checkStoreOwnership = require('../middleware/CheckStoreOwnership');
const checkAdminOwnership = require('../middleware/CheckAdminOwnership');
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
// get total daily by store
router.get('/total-profit-daily/:store', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, getTotalDailyByStore);
// get total weekly by store
router.get('/total-profit-weekly/:store', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, getTotalWeeklyByStore);
// get total monthly by store
router.get('/total-profit-monthly/:store', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, getTotalMonthlyByStore);
// get total yearly by store
router.get('/total-profit-yearly/:store', checkAuthrozation([process.env.STORE_TYPE]), checkStoreOwnership, getTotalYearlyByStore);

// ADMIN_API routes below
// get all subscriptions stats
router.get('/subscriptions/all/:admin', checkAuthrozation([process.env.ADMIN_TYPE]), checkAdminOwnership, getAllSubscriptionsStats);
// get subscriptions stats
router.get('/subscriptions/:admin', checkAuthrozation([process.env.ADMIN_TYPE]), checkAdminOwnership, getSubscriptionsStats);
// get total daily subscriptions
router.get('/subscriptions/daily/:admin', checkAuthrozation([process.env.ADMIN_TYPE]), checkAdminOwnership, getTotalDailySubscriptions);
// get total weekly subscriptions
router.get('/subscriptions/weekly/:admin', checkAuthrozation([process.env.ADMIN_TYPE]), checkAdminOwnership, getTotalWeeklySubscriptions);
// get total monthly subscriptions
router.get('/subscriptions/monthly/:admin', checkAuthrozation([process.env.ADMIN_TYPE]), checkAdminOwnership, getTotalMonthlySubscriptions);
// get total yearly subscriptions
router.get('/subscriptions/yearly/:admin', checkAuthrozation([process.env.ADMIN_TYPE]), checkAdminOwnership, getTotalYearlySubscriptions);
// get store access requests
router.get('/store-access-requests/:admin', checkAuthrozation([process.env.ADMIN_TYPE]), checkAdminOwnership, getStoreAccessRequests);
// get subscription soon to expire
router.get('/subscription-soon-to-expire/:admin', checkAuthrozation([process.env.ADMIN_TYPE]), checkAdminOwnership, getSubscriptionSoonToExpire);
// get stats for admin
router.get('/admin/stats/:admin', checkAuthrozation([process.env.ADMIN_TYPE]), checkAdminOwnership, getStatsForAdmin);

module.exports = router;