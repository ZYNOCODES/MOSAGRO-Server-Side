const Admin = require('../model/AdminModel');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');

//fetch specific Admin
const GetAdmin = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    //check if id is valid 
    if(!id){
        const err = new CustomError('ID non valide', 400);
        return next(err);
    }
    const admin = await Admin.findById(id);
    if(!admin){
        const err = new CustomError('Erreur lors de la recherche de l\'administrateur', 404);
        return next(err);
    }
    res.status(200).json(admin);
});

module.exports = {
    GetAdmin
}