const { createLogger, format, transports } = require('winston');
const env = process.env.NODE_ENV || 'development';

const enumerateErrorFormat = format(info => {
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
      handleExceptions: true,
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
