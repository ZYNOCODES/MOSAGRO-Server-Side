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
            //check req.user.code if its starts with the correct code
            // switch (userType) {
            //     case process.env.CLIENT_TYPE:
            //         if (!req.user.code.startsWith('C') || req.user._id != id) {
            //             return next(new CustomError('Unauthorized access. You do not have permission to access this resource.', 403));
            //         }
            //         break;
            //     case process.env.ADMIN_TYPE:
            //         if (!req.user.code.startsWith('A') || req.user._id != id) {
            //             return next(new CustomError('Unauthorized access. You do not have permission to access this resource.', 403));
            //         }
            //         break;
            //     case process.env.STORE_TYPE:
            //         if (!req.user.code.startsWith('S') || req.user._id != id) {
            //             return next(new CustomError('Unauthorized access. You do not have permission to access this resource.', 403));
            //         }
            //         break;
            //     default:
            //         return next(new CustomError('Authentication rejected', 401));
            // }
            // User type is allowed, continue
            next();
        } catch (error) {
            return next(new CustomError('Invalid or expired token.', 401));
        }
    });
};

module.exports = checkAuthorization;
