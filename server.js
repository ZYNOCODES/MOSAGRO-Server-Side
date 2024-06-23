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