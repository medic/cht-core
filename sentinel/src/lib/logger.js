const { createLogger, format, transports } = require('winston'),
  env = process.env.NODE_ENV || 'development';

const logger = createLogger({
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
        format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
      ),
    }),
  ],
});

module.exports = logger;
