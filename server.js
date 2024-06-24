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
const UserRoutes = require('./route/UserRoutes');
const StockRoutes = require('./route/StockRoutes');

//express app
const app = express();
 
//midleware
app.use(cors());
app.use(body.json({limit: '50mb'}));
app.use(body.urlencoded({limit: '50mb', extended: true}));
app.use(limiter);
app.use(validateRequest);

//routes
app.use('/Product', Productroutes); 
app.use('/Auth', Authroutes);
app.use('/Brand', Brandroutes);
app.use('/SubscriptionStore', SubscriptionStoreRoutes);
app.use('/Subscription', SubscriptionRoutes);
app.use('/Store', StoreRoutes);
app.use('/User', UserRoutes);
app.use('/Stock', StockRoutes);


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