require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const body = require('body-parser');
const ErrorHandler = require('./controller/ErrorController');
//security
const cors = require('cors');
const limiter = require('./middleware/RateLimiting');
const validateRequest = require('./middleware/Sanitize');
//routes
const Authroutes = require('./route/AuthRoutes');
const Productroutes = require('./route/ProductRoutes');
const Brandroutes = require('./route/BrandRoutes');
const SubscriptionStoreRoutes = require('./route/SubscriptionStoreRoutes');
const SubscriptionRoutes = require('./route/SubscriptionRoutes');
const StoreRoutes = require('./route/StoreRoutes');
const AdminRoutes = require('./route/AdminRoutes');
const UserRoutes = require('./route/UserRoutes');
const StockRoutes = require('./route/StockRoutes');
const MyStoresRoutes = require('./route/MyStoresRoutes');
const FavoriteRoutes = require('./route/FavoriteRoutes');
const PopularProductRoutes = require('./route/PopularProductRoutes');
const PublicityRoutes = require('./route/PublicityRoutes');
const ReceiptRoutes = require('./route/ReceiptRoutes');

//express app
const app = express();
 
//midleware
app.use(cors());
app.use(body.json({limit: '50mb'}));
app.use(body.urlencoded({limit: '50mb', extended: true}));
app.use(limiter);
// app.use(validateRequest); this making a problem in requests

//routes
app.use('/api/Product', Productroutes); 
app.use('/api/Auth', Authroutes);
app.use('/api/Brand', Brandroutes);
app.use('/api/SubscriptionStore', SubscriptionStoreRoutes);
app.use('/api/Subscription', SubscriptionRoutes);
app.use('/api/Store', StoreRoutes);
app.use('/api/Admin', AdminRoutes);
app.use('/api/User', UserRoutes);
app.use('/api/Stock', StockRoutes);
app.use('/api/MyStores', MyStoresRoutes);
app.use('/api/Favorite', FavoriteRoutes);
app.use('/api/PopularProduct', PopularProductRoutes);
app.use('/api/Publicity', PublicityRoutes);
app.use('/api/Receipt', ReceiptRoutes);

//error handling
app.use(ErrorHandler);

//connect to db
mongoose.connect(process.env.MONGO_URL)
    .then(() => {
        //listen for requests
        app.listen(process.env.PORT, () => {
            console.log('connect to database and listening on port ', process.env.PORT);
        });
    }).catch((err) => {
        console.log('error connecting to db', err);
});