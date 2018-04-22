class PublicError extends Error {
  constructor(publicMessage, ...args) {
    super(publicMessage, ...args);
    this.publicMessage = publicMessage;
  }
}

module.exports = PublicError;
