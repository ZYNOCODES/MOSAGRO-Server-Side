const Notification = require('../model/NotificationModel');

const findNotificationById = async (id) => {
    return await Notification.findById(id);
};
//create new notification
const createNewNotificationForClient = async (clientID, type, msg, session) => {
    return await Notification.create(
        [{
            ownerModel: 'client',
            owner: clientID,
            message: msg,
            type: type
        }],
        { session } 
    );
};
//create new notification
const createNewNotificationForStore = async (storeID, type, msg, session) => {
    return await Notification.create(
        [{
            ownerModel: 'store',
            owner: storeID,
            message: msg,
            type: type
        }],
        { session } 
    );
};
module.exports = {
    findNotificationById,
    createNewNotificationForClient,
    createNewNotificationForStore
}