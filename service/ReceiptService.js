const Receipt = require('../model/ReceiptModel');

const findReceiptById = async (id) => {
    return await Receipt.findById(id);
};
const findNoneDeliveredReceiptByStore = async (store, id, session) => {
    if (session) 
        return await Receipt.findOne({
            _id: id,
            store: store,
            delivered: false
        }).session(session);
    else
        return await Receipt.findOne({
            _id: id,
            store: store,
            delivered: false
        });
}

module.exports = {
    findReceiptById,
    findNoneDeliveredReceiptByStore
}