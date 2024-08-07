const Receipt = require('../model/ReceiptModel');

const findReceiptById = async (id) => {
    return await Receipt.findById(id);
};

module.exports = {
    findReceiptById,
}