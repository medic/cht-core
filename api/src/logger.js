const { createLogger, format, transports } = require('winston'),
    { combine, timestamp, prettyPrint } = format,
    logger = createLogger({
        format: combine(
            timestamp(),
            prettyPrint()
        ),
        transports: [
            new transports.File({ filename: 'error.log', level: 'error' }),
            new transports.File({ filename: 'medic.log' })
        ]
    });

if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console({
        format: format.simple()
    }));
};

module.exports = logger