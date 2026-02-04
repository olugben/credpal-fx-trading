// src/fx/fx.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { FxService } from './fx.service';
import { Currency } from 'src/common/enums/currency.enum';

@Controller('fx')
export class FxController {
  constructor(private readonly fxService: FxService) {}

  
  @Get('rates')
  async getRates() {
    return this.fxService.getAllRates();
  }


  @Get('rate')
  async getRate(
    @Query('from') from: Currency,
    @Query('to') to: Currency,
  ) {
    const rate = await this.fxService.getRate(from, to);
    return { from, to, rate };
  }
}
