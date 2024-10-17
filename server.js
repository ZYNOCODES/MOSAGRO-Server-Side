require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const body = require('body-parser');
const ErrorHandler = require('./controller/ErrorController');
//security
const cors = require('cors');
const RemoveSpacesMiddleware = require('./middleware/RemoveSpacesMiddleware');


//routes
const Authroutes = require('./route/AuthRoutes');
const Productroutes = require('./route/ProductRoutes');
const Brandroutes = require('./route/BrandRoutes');
const Categoryroutes = require('./route/CategoryRoutes');
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
const ReceiptStatusRoutes = require('./route/ReceiptStatusRoutes');
const CitiesRoutes = require('./route/CitiesRoutes');
const LossesRoutes = require('./route/LossesRoutes');
const StockStatusRoutes = require('./route/StockStatusRoutes');
const FournisseurRoutes = require('./route/FournisseurRoutes');
const PurchaseRoutes = require('./route/PurchaseRoutes');
const SousPurchaseRoutes = require('./route/SousPurchaseRoutes');

//express app
const app = express();
 
//midleware
app.use(cors());
app.use(body.json({limit: '50mb'}));
app.use(body.urlencoded({limit: '50mb', extended: true}));
app.use(RemoveSpacesMiddleware);

//routes
app.use('/api/Product', Productroutes); 
app.use('/api/Auth', Authroutes);
app.use('/api/Brand', Brandroutes);
app.use('/api/Category', Categoryroutes);
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
app.use('/api/ReceiptStatus', ReceiptStatusRoutes);
app.use('/api/Cities', CitiesRoutes);
app.use('/api/Losses', LossesRoutes);
app.use('/api/StockStatus', StockStatusRoutes);
app.use('/api/Fournisseur', FournisseurRoutes);
app.use('/api/Purchase', PurchaseRoutes);
app.use('/api/SousPurchase', SousPurchaseRoutes);


//error handling
app.use(ErrorHandler);

//serve static files
app.use("/files", express.static("./files"))
app.use(express.static("./public/build"));
app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "public","build", "index.html"));
});


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