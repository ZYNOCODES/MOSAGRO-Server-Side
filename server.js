require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Productroutes = require('./route/ProductRoutes');
const body = require('body-parser');
const ErrorHandler = require('./controller/ErrorController');
const limiter = require('./middleware/RateLimiting');

//express app
const app = express();
 
//midleware
app.use(cors());
app.use(body.json({limit: '50mb'}));
app.use(body.urlencoded({limit: '50mb', extended: true}));
app.use(limiter);

//routes
app.use('/Product', Productroutes); 

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