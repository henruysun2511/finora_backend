import { createLogger, transports, format, Logger as WinstonInstance } from 'winston';
import { AppConfig } from '../../config/app.config';

export class WinstonConfig {
  createLogger(): WinstonInstance {
    const uppercaseLevel = () =>
      format((info) => {
        if (info.level) info.level = info.level.toString().toUpperCase();
        return info;
      })();

    const customFormat = format.printf((info) => {
      const timestamp = String(info.timestamp ?? new Date().toISOString());
      const level = String(info.level ?? 'INFO');
      const message = String(info.stack ?? info.message ?? '');
      const context = info.context ? ` [${String(info.context)}]` : '';
      const trace = info.trace ? `\n${String(info.trace)}` : '';
      return `[FINORA] ${timestamp} ${level}${context}: ${message}${trace}`.trim();
    });

    const consoleFormat = format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      uppercaseLevel(),
      format.colorize({ all: true }),
      format.errors({ stack: true }),
      customFormat,
    );

    const fileFormat = format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      uppercaseLevel(),
      format.errors({ stack: true }),
      customFormat,
    );

    const transportsList: any[] = [
      new transports.Console({
        level: process.env.LOGGER_CONSOLE_LEVEL || (AppConfig.IS_DEV ? 'debug' : 'info'),
        format: consoleFormat,
      }),
    ];

    if (AppConfig.IS_PROD) {
      const fileTransport = new transports.File({
        filename: 'logs/finora.log',
        level: 'info',
        format: fileFormat,
        maxsize: 50 * 1024 * 1024,
        maxFiles: 14,
      });

      transportsList.push(fileTransport);
    }

    return createLogger({
      level: AppConfig.IS_PROD ? 'info' : 'debug',
      transports: transportsList,
    });
  }
}
