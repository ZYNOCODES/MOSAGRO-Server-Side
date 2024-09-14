const moment = require('moment');
require('moment-timezone');

//get current utf+1 datetime
const getCurrentDateTime = () => {
    return moment().utc(1);
}

module.exports = {
    getCurrentDateTime
}