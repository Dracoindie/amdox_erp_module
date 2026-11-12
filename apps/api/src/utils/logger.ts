import winston from 'winston';

const { combine, timestamp, colorize, printf, json } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  printf(({ level, message, timestamp: ts, ...meta }) => {
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${ts} [${level}] ${message}${extra}`;
  }),
);

const isProd = process.env.NODE_ENV === 'production';

// Logs go to stdout only; in containers the platform collects them.
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'error' : 'info'),
  format: isProd ? combine(timestamp(), json()) : devFormat,
  transports: [new winston.transports.Console()],
});
