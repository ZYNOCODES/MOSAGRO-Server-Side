const JWT = require('jsonwebtoken');

//jwt secret
const createToken = (id) => {
    return JWT.sign({_id: id}, process.env.SECRET_KEY, {expiresIn: '1d'});
}

module.exports = {
    createToken
};