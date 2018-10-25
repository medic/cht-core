const { createLogger, format, transports: trans } = require('winston'),
    env = process.env.NODE_ENV || 'development',
    fs = require('fs'),
    logDir = 'log';
require('winston-daily-rotate-file');

// Create the log directory if it does not exist
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const dailyRotateFileTransport = new trans.DailyRotateFile({
    filename: 'medic-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    dirname: logDir,
    maxSize: '20m',
    maxFiles: '7d'
});

const transports = {
    console: new trans.Console({
        level: 'info',
        format: format.combine(
            // https://github.com/winstonjs/winston/issues/1345
            format(info => {
                info.level = info.level.toUpperCase()
                return info;
            })(),
            format.colorize(),
            format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
        )
    }),
    file: dailyRotateFileTransport
  };

const logger = createLogger({
    // change level if in dev environment versus production
    level: env === 'development' ? 'debug' : 'info',
    format: format.combine(
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.printf(info => `${info.timestamp} ${info.level.toUpperCase()}: ${info.message}`)
    ),
    transports: [
        transports.file,
        transports.console
    ]
});

module.exports = {
    logger: logger,
    transports: transports
}