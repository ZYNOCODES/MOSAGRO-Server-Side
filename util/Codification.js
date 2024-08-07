const Product = require('../model/ProductModel');
const User = require('../model/UserModel');
const Store = require('../model/StoreModel');
const Receipt = require('../model/ReceiptModel');
const Brand = require('../model/BrandModel');
const { getCurrentDateTime } = require('../util/DateTime.js');

//Product codification
const ProductCode = async (BrandCode, SubName, Size) => {
    //2 degits random 
    const code = BrandCode + SubName + Size;
    //check if the product already exist with that code
    const existCodeProduct = await Product.findOne({code: code});
    if(existCodeProduct){
        return null;
    }
    return code;
}

//User codification
const UserCode = async (PostalCode, type) => {
    //2 degits random 
    const degits = Math.random().toString(36).substring(2, 4).toUpperCase();
    //get current date and time
    const dateTime = getCurrentDateTime();
    const code = type + PostalCode + dateTime + degits;
    //check if the user already exist with that code
    const existCodeUser = await User.findOne({code: code});
    if(existCodeUser){
        return null;
    }
    return code;
}
//Store codification
const StoreCode = async (PostalCode, type) => {
    //2 degits random 
    const degits = Math.random().toString(36).substring(2, 4).toUpperCase();
    //get current date and time in yyyymmddhhmmss format
    const dateTime = getCurrentDateTime();
    var code = type + PostalCode + dateTime + degits;
    //check if the store already exist with that code
    const existCodeStore = await Store.findOne({code: code});
    if(existCodeStore){
        return null;
    }
    return code;
};

//Receipt codification
const ReceiptCode = async (UserCode, session) => {
    //get current date and time
    const dateTime = getCurrentDateTime();
    const code = UserCode + dateTime;
    //check if the receipt already exist with that code
    const existCodeReceipt = await Receipt.findOne({code: code}).session(session);
    if(existCodeReceipt){
        return null;
    }
    return code;
}

//Brand codification
const BrandCode = async (Name) => {
    //take random 2 strings from name
    const code = Name.substring(0, 2).toUpperCase();
    //check if the brand already exist with that code
    const existCodeBrand = await Brand.findOne({code: code});
    if(existCodeBrand){
        return null;
    }
    return code;
}

module.exports = {
    ProductCode,
    UserCode,
    StoreCode,
    ReceiptCode,
    BrandCode,
};