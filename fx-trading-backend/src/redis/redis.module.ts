import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

const RedisProvider = {
  provide: 'REDIS_CLIENT',
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    return new Redis({
      host: config.get<string>('REDIS_HOST', 'localhost'),
      port: config.get<number>('REDIS_PORT', 6379),
      password: config.get<string>('REDIS_PASSWORD'),
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });
  },
};

@Module({
  imports: [ConfigModule],
  providers: [RedisProvider],
  exports: [RedisProvider],
})
export class RedisModule {}
