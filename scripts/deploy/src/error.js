export class UserRuntimeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UserRuntimeError';
  }
}

export class CertificateError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CertificateError';
  }
}
