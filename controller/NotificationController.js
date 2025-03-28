const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');
const Notification = require('../model/NotificationModel'); 
const utilMoment = require('../util/Moment');
const moment = require('moment');

//get all new notifications by store
const getNewNotificationsByStore = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    const notifications = await Notification.find({
        ownerModel: 'store', 
        owner: store,
        read: false
    }).sort({createdAt: -1});
    //check if there are any notifications
    if (!notifications || notifications.length <= 0) {
        return next(new CustomError('No notifications found', 404));
    }
    res.status(200).json(notifications);
});
//get all old notifications by store
const getOldNotificationsByStore = asyncErrorHandler(async (req, res, next) => {
    const { store } = req.params;
    const notifications = await Notification.find({
        ownerModel: 'store', 
        owner: store,
        read: true
    }).sort({createdAt: -1});
    //check if there are any notifications
    if (!notifications || notifications.length <= 0) {
        return next(new CustomError('No notifications found', 404));
    }
    res.status(200).json(notifications);
});
//get all notifications by client
const getNonReadedNotificationsByClient = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const notifications = await Notification.find({
        ownerModel: 'client', 
        owner: id,
        read: false
    }).sort({createdAt: -1});
    //check if there are any notifications
    if (!notifications || notifications.length <= 0) {
        return next(new CustomError('No notifications found', 404));
    }
    res.status(200).json(notifications);
});
//get all readed notifications by client
const getReadedNotificationsByClient = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const notifications = await Notification.find({
        ownerModel: 'client', 
        owner: id,
        read: true
    }).sort({createdAt: -1});
    //check if there are any notifications
    if (!notifications || notifications.length <= 0) {
        return next(new CustomError('No notifications found', 404));
    }
    res.status(200).json(notifications);
});
//get all notifications by admin
const getNonReadedNotificationsByAdmin = asyncErrorHandler(async (req, res, next) => {
    const notifications = await Notification.find({
        ownerModel: 'admin', 
        owner: null,
        read: false
    }).sort({createdAt: -1});
    //check if there are any notifications
    if (!notifications || notifications.length <= 0) {
        return next(new CustomError('No notifications found', 404));
    }
    res.status(200).json(notifications);
});
//get all readed notifications by admin
const getReadedNotificationsByAdmin = asyncErrorHandler(async (req, res, next) => {
    const notifications = await Notification.find({
        ownerModel: 'admin', 
        owner: null,
        read: true
    }).sort({createdAt: -1});
    //check if there are any notifications
    if (!notifications || notifications.length <= 0) {
        return next(new CustomError('No notifications found', 404));
    }
    res.status(200).json(notifications);
});
//mark notification as read
const markNotificationAsRead = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const notification = await Notification.findById(id);
    //check if notification exists
    if (!notification) {
        return next(new CustomError('Notification not found', 404));
    }
    notification.read = true;
    const updatedNotification = await notification.save();
    //check if notification was updated
    if (!updatedNotification) {
        return next(new CustomError('Could not mark notification as read, try again', 400));
    }
    res.status(200).json({ message: 'Notification marked as read successfully' });
});
//mark all notifications as read
const markAllNotificationsAsRead = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const notifications = await Notification.updateMany({owner: id}, {read: true});
    //check if notifications were updated
    if (!notifications) {
        return next(new CustomError('Could not mark notifications as read, try again', 400));
    }
    res.status(200).json({ message: 'Notifications marked as read successfully' });
});

module.exports = {
    getNewNotificationsByStore,
    getOldNotificationsByStore,
    getNonReadedNotificationsByClient,
    getReadedNotificationsByClient,
    getNonReadedNotificationsByAdmin,
    getReadedNotificationsByAdmin,
    markNotificationAsRead,
    markAllNotificationsAsRead,
};