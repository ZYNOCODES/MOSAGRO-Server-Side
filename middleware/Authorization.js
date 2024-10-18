const jwt = require('jsonwebtoken');
const CustomError = require('../util/CustomError');
const asyncErrorHandler = require('../util/asyncErrorHandler');

const checkAuthorization = (allowedTypes) => {
    return asyncErrorHandler(async (req, res, next) => {
        const authorizationHeader = req.headers.authorization;

        if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
            return next(new CustomError('Authorization token is required', 400));
        }

        const token = authorizationHeader.split(' ')[1];
        
        try {
            const decodedToken = jwt.verify(token, process.env.SECRET_KEY);
            const userType = decodedToken.type;
            const id = decodedToken.id;

            //check if user type is allowed
            if (!Array.isArray(allowedTypes) ||!allowedTypes.includes(userType)) {
                return next(new CustomError('Unauthorized access. You do not have permission to access this resource.', 403));
            }

            // User type is allowed, continue
            next();
        } catch (error) {
            return next(new CustomError('Invalid or expired token.', 401));
        }
    });
};

module.exports = checkAuthorization;
