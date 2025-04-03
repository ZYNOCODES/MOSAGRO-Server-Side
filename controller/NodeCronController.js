const cron = require('node-cron');
const SubscriptionStore = require('../model/SubscriptionStoreModel');
const Notification = require('../model/NotificationModel'); 
const utilMoment = require('../util/Moment');
const moment = require('moment');

// Function to check for expiring subscriptions and create notifications
const checkExpiringSubscriptions = async () => {
    try {
        const oneMonthFromNow = utilMoment.getCurrentDateTime().toDate();
        oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

        const currentDate = utilMoment.getCurrentDateTime();

        // Get the start of the current month to check recent notifications
        const startOfMonth = utilMoment.getCurrentDateTime().startOf('month').toDate();

        // Find subscriptions that are expiring within one month and are not already expired
        const expiringSubscriptions = await SubscriptionStore.find({
            expiryDate: { $lte: oneMonthFromNow, $gt: currentDate }
        }).populate({
            path: 'store',
            select: '_id firstName lastName phoneNumber storeName'
        });

        if (expiringSubscriptions.length === 0) {
            console.log('No expiring subscriptions found.');
            return;
        }

        // Find stores that were already notified this month
        const notifiedStoreIds = (
            await Notification.find({
                type: 'subscription_expiry',
                createdAt: { $gte: startOfMonth },
                owner: { $in: expiringSubscriptions.map(sub => sub.store._id) }
            }).distinct('owner')
        ).map(id => id.toString());

        // Filter out subscriptions for stores that have already been notified
        const subscriptionsToNotify = expiringSubscriptions.filter(sub =>
            !notifiedStoreIds.includes(sub.store._id.toString())
        );

        if (subscriptionsToNotify.length === 0) {
            console.log('All expiring subscriptions have already been notified this month.');
            return;
        }

        // Create notifications only for stores that haven't been notified this month
        const notifications = subscriptionsToNotify.map(({ store, expiryDate }) => ({
            ownerModel: 'store',
            owner: store._id,
            message: `Votre abonnement expire le ${moment(expiryDate).format('YYYY-MM-DD HH:mm:ss')}. Veuillez le renouveler pour continuer à utiliser nos services.`,
            type: 'subscription_expiry'
        }));

        await Notification.insertMany(notifications);
        console.log(`Created ${notifications.length} new notifications for expiring subscriptions.`);
    } catch (error) {
        console.error('Error checking expiring subscriptions:', error);
    }
};

// Schedule the job to run every day at midnight
const startSubscriptionExpiryCronJob = () => {
    // cron.schedule('*/1 * * * *', async () => {
    //     console.log('Running subscription expiry check every minute for testing...');
    //     await checkExpiringSubscriptions();
    // });
    cron.schedule('0 6 * * *', async () => {
        console.log('Running subscription expiry check at 6:00 AM...');
        await checkExpiringSubscriptions();
    });
};

module.exports = {
    startSubscriptionExpiryCronJob
};