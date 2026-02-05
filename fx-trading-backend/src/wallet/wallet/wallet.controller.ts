import { Controller, Get, Post, Body, Req, BadRequestException } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { Currency } from 'src/common/enums/currency.enum';
import { Repository } from 'typeorm';
import { User } from 'src/users/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ConvertCurrencyDto } from './dto/currencyConverterDto';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService,   @InjectRepository(User)
      private readonly userRepo: Repository<User>,) {}

  @Get()
  async getBalances(@Body('email') email: string) {
    return this.walletService.getBalancesByEmail(email);
  }

  @Post('fund')
  async fundWallet(
    @Body() body: { email: string; currency: Currency; amount: number },
  ) {
    return this.walletService.fundWalletByEmail(body.email, body.currency, body.amount);
  }
@Post('convert')
async convertCurrency(@Body() dto: ConvertCurrencyDto) {
  const user = await this.userRepo.findOne({ where: { email: dto.email } });
  if (!user) throw new BadRequestException('User not found');

  return this.walletService.convertCurrency(
    user.id,
    dto.fromCurrency,
    dto.toCurrency,
    dto.amount,
  );
}
@Post('trade')
async trade(
  @Body() body: { email: string; fromCurrency: Currency; toCurrency: Currency; amount: number },
) {
  const { email, fromCurrency, toCurrency, amount } = body;
  return this.walletService.tradeWalletByEmail(email, fromCurrency, toCurrency, amount);
}


}
