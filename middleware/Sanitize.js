const { validationResult, check } = require('express-validator');
const CustomError = require('../util/CustomError');
const asyncErrorHandler = require('../util/asyncErrorHandler');

const validateRequest = asyncErrorHandler(async (req, res, next) => {
    const validations = [];

    for (const key in req.body) {
        if (req.body.hasOwnProperty(key)) {
            validations.push(check(key).trim().escape());
        }
    }

    for (const key in req.params) {
        if (req.params.hasOwnProperty(key)) {
            validations.push(check(key).trim().escape());
        }
    }

    for (const key in req.query) {
        if (req.query.hasOwnProperty(key)) {
            validations.push(check(key).trim().escape());
        }
    }

    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const err = new CustomError('La validation a échoué', 400);
        err.details = errors.array();
        return next(err);
    }

    next();
});

module.exports = validateRequest;
