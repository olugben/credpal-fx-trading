import { Module } from '@nestjs/common';
import { FxService } from './fx.service';
import { HttpModule } from '@nestjs/axios';
import { FxController } from './fx.controller';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [HttpModule, RedisModule],
  controllers:[FxController],
  providers: [FxService],
  exports: [FxService],
})
export class FxModule {}
