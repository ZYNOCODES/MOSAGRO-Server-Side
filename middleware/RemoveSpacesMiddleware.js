const trimSpacesMiddleware = (req, res, next) => {
    // Function to remove spaces from strings
    const trimSpaces = (data) => {
        if (typeof data === 'string') {
          const trimmed = data.trim();
          return trimmed === '' ? '' : trimmed;
        }
        return data;
      };

    // Process req.body
    if (req.body) {
        Object.keys(req.body).forEach((key) => {
        req.body[key] = trimSpaces(req.body[key]);
        });
    }

    // Process req.params
    if (req.params) {
        Object.keys(req.params).forEach((key) => {
        req.params[key] = trimSpaces(req.params[key]);
        });
    }

    // Process req.query
    if (req.query) {
        Object.keys(req.query).forEach((key) => {
        req.query[key] = trimSpaces(req.query[key]);
        });
    }

    next();
};

module.exports = trimSpacesMiddleware;
  