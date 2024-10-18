const Losses = require('../model/LossesModel');

const findLossesById = async (id) => {
    return await Losses.findById(id);
};
const findLossesByIdAndStore = async (id, store) => {
    return await Losses.findOne({
        _id: id,
        owner: store,
        ownerModel: 'store'
    });
}
const findLossesByIdAndAdmin = async (id, admin) => {
    return await Losses.findOne({
        _id: id,
        owner: admin,
        ownerModel: 'admin'
    });
};

module.exports = {
    findLossesById,
    findLossesByIdAndStore,
    findLossesByIdAndAdmin
}