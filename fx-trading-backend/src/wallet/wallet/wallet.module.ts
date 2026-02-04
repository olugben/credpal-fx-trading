import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { Wallet } from './wallet.entity';
import { WalletBalance } from './wallet-balance.entity';
import { User } from 'src/users/user.entity';
import { FxModule } from 'src/fx/fx.module';
import { TransactionsModule } from 'src/transactions/transactions/transactions.module';

@Module({
  imports: [TypeOrmModule.forFeature([Wallet, WalletBalance, User]), FxModule,   TransactionsModule,],
  providers: [WalletService],
  controllers: [WalletController],
  exports: [WalletService],
})
export class WalletModule {}


