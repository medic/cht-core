const { createLogger, format, transports } = require('winston');
const env = process.env.NODE_ENV || 'development';

const cleanUpRequestError = (error) => {
  const requestErrorConstructors = ['RequestError', 'StatusCodeError', 'TransformError'];
  if (error && requestErrorConstructors.includes(error.constructor.name)) {
    delete error.options;
    delete error.request;
    delete error.response;
  }
};

const enumerateErrorFormat = format(info => {
  // errors can be passed as "Symbol('splat')" properties, when doing: logger.error('message: %o', actualError);
  const symbolProperties = Object.getOwnPropertySymbols(info);
  if (symbolProperties && symbolProperties.length) {
    symbolProperties.forEach(property => {
      const values = info[property];
      if (!values || !Array.isArray(values)) {
        return;
      }
      values.forEach(value => cleanUpRequestError(value));
    });
  }
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
        format.colorize(),
        format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss',
        }),
        format.printf(info => `${info.timestamp} ${info.level}: ${info.message} ${info.stack ? info.stack : ''}`)
      ),
    }),
  ],
});

module.exports = logger;
