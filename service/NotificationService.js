const Notification = require('../model/NotificationModel');

const findNotificationById = async (id) => {
    return await Notification.findById(id);
};
//create new notification
const createNewNotificationForClient = async (clientID, storeName, type, session) => {
    return await Notification.create(
        [{
            ownerModel: 'client',
            owner: clientID,
            message: type == 'order_ready' ?
                `Your order from ${storeName} is ready for pickup`
                :
                `Your order from ${storeName} has been delivered and is on its way to you`,
            type: type
        }],
        { session } 
    );
};
//create new notification
const createNewNotificationForStore = async (storeID, type, session) => {
    return await Notification.create(
        [{
            ownerModel: 'store',
            owner: storeID,
            message: 'You have a new client access request check it out in your user authentication page',
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