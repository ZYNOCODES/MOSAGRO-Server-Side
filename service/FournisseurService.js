const Fournisseur = require('../model/FournisseurModel');

const findFournisseurById = async (id) => {
    return await Fournisseur.findById(id);
};
const findFournisseurByIdANDStore = async (id, store) => {
    return await Fournisseur.findOne({
        _id: id,
        store: store
    });
};
const findFournisseurByPhone = async (phone, store) => {
    return await Fournisseur.findOne({
        phoneNumber: phone,
        store: store
    });
};
module.exports = {
    findFournisseurById,
    findFournisseurByPhone,
    findFournisseurByIdANDStore
}