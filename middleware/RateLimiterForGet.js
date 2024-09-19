const { rateLimit } = require("express-rate-limit");
const CustomError = require('../util/CustomError');

const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true, // add the `RateLimit-*` headers to the response
    legacyHeaders: false, // remove the `X-RateLimit-*` headers from the response
    skipFailedRequests: true, // only count 200s and 3xxs responses
    handler: (req, res, next, options) => {
        const error = new CustomError('Trop de demandes, veuillez réessayer plus tard après 1 minute.', 429);
        next(error);
    },
});

module.exports = limiter;