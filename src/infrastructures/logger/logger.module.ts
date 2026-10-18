import { Global, Module } from '@nestjs/common';
import { CustomLogger } from './logger.service';
import { WinstonConfig } from './winston.config';

@Global()
@Module({
  providers: [
    {
      provide: 'WINSTON_LOGGER',
      useFactory: () => {
        return new WinstonConfig().createLogger();
      },
    },
    {
      provide: CustomLogger,
      useFactory: (winston) => new CustomLogger(winston),
      inject: ['WINSTON_LOGGER'],
    },
  ],
  exports: ['WINSTON_LOGGER', CustomLogger],
})
export class LoggerModule {}
