const BadRequestError = require('./bad-request');

class UnauthError extends BadRequestError {
  constructor(message) {
    super(message, 401, 'UNAUTH');
  }
}

module.exports = UnauthError;
