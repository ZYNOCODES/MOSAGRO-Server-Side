const CitiesFR = require('../model/CitiesFRModel');

const findCitiesFRById = async (id) => {
    return await CitiesFR.findById(id);
};
const findCitiesFRByCodeC = async (codeW, codeC) => {
    return await CitiesFR.findOne({
        codeW: codeW,
        codeC: codeC
    });
};
module.exports = {
    findCitiesFRById,
    findCitiesFRByCodeC
}