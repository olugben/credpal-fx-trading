import { Module } from '@nestjs/common';
import { FxService } from './fx.service';
import { HttpModule } from '@nestjs/axios';
import { FxController } from './fx.controller';

@Module({
  imports: [HttpModule],
  controllers:[FxController],
  providers: [FxService],
  exports: [FxService],
})
export class FxModule {}
