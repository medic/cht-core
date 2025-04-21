class PublicError extends Error {
  constructor(publicMessage, ...args) {
    super(publicMessage, ...args);
    this.publicMessage = publicMessage;
  }
}

class NotFoundError extends Error {
  constructor(message, ...args) {
    super(message, ...args);
    this.status = 404; // simulate PouchDb error
    this.statusCode = 404; // simulate Request error
  }
}

class PermissionError extends Error {
  constructor(message, ...args) {
    super(message, ...args);
    this.code = 403;
  }
}

module.exports = {
  PublicError,
  NotFoundError,
  PermissionError,
};
