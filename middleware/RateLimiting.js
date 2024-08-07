const { rateLimit } = require("express-rate-limit");

const limiter = rateLimit({
    windowMs: 60 * 1000, // 5 minutes
    limit: 60, // each IP can make up to 20 requests per `windowsMs` (1 minutes)
    standardHeaders: true, // add the `RateLimit-*` headers to the response
    legacyHeaders: false, // remove the `X-RateLimit-*` headers from the response
});

module.exports = limiter;