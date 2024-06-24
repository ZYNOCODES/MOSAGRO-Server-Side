const JWT = require('jsonwebtoken');

//jwt secret
const createToken = (id, type) => {
    return JWT.sign({id: id, type: type}, process.env.SECRET_KEY, {expiresIn: '1d'});
}

module.exports = {
    createToken
};