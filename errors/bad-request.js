class BadRequestError extends Error {
  constructor(message, status = 400, errorCode='') {
    super(message);
    this.name = 'BadRequestError';
    this.status = status;
    this.errorCode = errorCode;
  }
}

module.exports = BadRequestError;
