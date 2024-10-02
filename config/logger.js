const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const logDir = 'logs';

const dailyRotateFileTransport = new DailyRotateFile({
    filename: `${logDir}/price-tracker-%DATE%.log`,
    datePattern: 'YYYYMMDD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d'
});

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}]: ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        dailyRotateFileTransport
    ]
});

module.exports = logger;