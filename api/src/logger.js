const { createLogger, format, transports } = require('winston');
const env = process.env.NODE_ENV || 'development';
const DATE_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSS';

const cleanUpErrorsFromSymbolProperties = (info) => {
  if (!info) {
    return;
  }

  // errors can be passed as "Symbol('splat')" properties, when doing: logger.error('message: %o', actualError);
  // see https://github.com/winstonjs/winston/blob/2625f60c5c85b8c4926c65e98a591f8b42e0db9a/README.md#streams-objectmode-and-info-objects
  Object.getOwnPropertySymbols(info).forEach(property => {
    const values = info[property];
    if (Array.isArray(values)) {
      values.forEach(value => cleanUpRequestError(value));
    }
  });
};

const cleanUpRequestError = (error) => {
  // These are the error types that we're expecting from request-promise-native
  // https://github.com/request/promise-core/blob/v1.1.4/lib/errors.js
  const requestErrorConstructors = ['RequestError', 'StatusCodeError', 'TransformError'];
  if (error && error.constructor && requestErrorConstructors.includes(error.constructor.name)) {
    // these properties could contain sensitive information, like passwords or auth tokens, and are not safe to log
    delete error.options;
    delete error.request;
    delete error.response;
  }
};

const enumerateErrorFormat = format(info => {
  cleanUpErrorsFromSymbolProperties(info);
  cleanUpRequestError(info);
  cleanUpRequestError(info.message);

  if (info.message instanceof Error) {
    info.message = Object.assign({
      message: info.message.message,
      stack: info.message.stack
    }, info.message);
  }

  if (info instanceof Error) {
    return Object.assign({
      message: info.message,
      stack: info.stack
    }, info);
  }

  return info;
});

const logger = createLogger({
  format: format.combine(
    enumerateErrorFormat(),
    format.splat(),
    format.simple()
  ),
  transports: [
    new transports.Console({
      // change level if in dev environment versus production
      level: env === 'development' ? 'debug' : 'info',
      format: format.combine(
        // https://github.com/winstonjs/winston/issues/1345
        format(info => {
          info.level = info.level.toUpperCase();
          return info;
        })(),
        format.timestamp({ format: DATE_FORMAT }),
        format.printf(info => `${info.timestamp} ${info.level}: ${info.message} ${info.stack ? info.stack : ''}`)
      ),
    }),
  ],
});

module.exports = logger;
module.exports.DATE_FORMAT = DATE_FORMAT;
