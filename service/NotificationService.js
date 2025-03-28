const Notification = require('../model/NotificationModel');

const findNotificationById = async (id) => {
    return await Notification.findById(id);
};  
//create new notification for admin
const createNewNotificationForAdmin = async (adminID, type, msg, session) => {
    return await Notification.create(
        [{
            ownerModel: 'admin',
            owner: adminID,
            message: msg,
            type: type
        }],
        { session } 
    );
};
//create new notification for client
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
//create new notification for store
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
    createNewNotificationForStore,
    createNewNotificationForAdmin
}