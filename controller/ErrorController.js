const CustomError = require('../util/CustomError');

const DevelopmentError = (err, res) => {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      stack: err.stack,
      error: err
    });
};

const ProductionError = (err, res) => {
  if(err.isOperational){
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  }else{
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong please try again later.'
    });
  }
};

const castErrorHandler = (err) => {
  const message = `Invalid value for ${err.path}: ${err.value}.`;
  return new CustomError(message, 400);
};

module.exports = (error, req, res, next) => {
    error.statusCode = error.statusCode || 500;
    error.status = error.status || 'error';
    if(process.env.NODE_ENV === 'development'){
      DevelopmentError(error, res);
    }else if(process.env.NODE_ENV === 'production'){
      if(error.name === 'CastError') error = castErrorHandler(error);
      ProductionError(error, res);
    }
};