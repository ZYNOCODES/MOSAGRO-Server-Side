const citiesAR = require('../model/CitiesARModel.js');
const citiesFR = require('../model/CitiesFRModel.js');
const CustomError = require('../util/CustomError.js');
const asyncErrorHandler = require('../util/asyncErrorHandler.js');

//fetch all arabic cities
const GetAllCitiesAR = asyncErrorHandler(async (req, res, next) => {
    const cities = await citiesAR.find({});
    if(cities.length < 1){
        const err = new CustomError('Error while fetching arabic cities', 400);
        return next(err);
    }
    res.status(200).json(cities);
});

//fetch all french cities
const GetAllCitiesFR = asyncErrorHandler(async (req, res, next) => {
    const cities = await citiesFR.find({});
    if(cities.length < 1){
        const err = new CustomError('Error while fetching french cities', 400);
        return next(err);
    }
    res.status(200).json(cities);
});

module.exports = {
    GetAllCitiesAR,
    GetAllCitiesFR,
}