import { ConsoleLogger, Injectable } from '@nestjs/common';
import { Logger as WinstonInstance } from 'winston';

@Injectable()
export class CustomLogger extends ConsoleLogger {
  constructor(private readonly winston: WinstonInstance) {
    super();
  }

  log(message: any, context?: string) {
    this.winston.info(message, { context });
  }

  error(message: string, trace?: any, context?: string, meta?: Record<string, any>) {
    this.winston.error(message, {
      context,
      trace: trace instanceof Error ? trace.stack : trace,
      ...meta,
    });
  }

  warn(message: any, context?: string) {
    this.winston.warn(message, { context });
  }

  debug(message: any, context?: string) {
    this.winston.debug(message, { context });
  }

  verbose(message: any, context?: string) {
    this.winston.verbose(message, { context });
  }
}
