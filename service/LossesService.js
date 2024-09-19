const Losses = require('../model/LossesModel');

const findLossesById = async (id) => {
    return await Losses.findById(id);
};

module.exports = {
    findLossesById,
}