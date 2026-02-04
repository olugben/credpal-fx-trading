import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/users/users.module';
import { Otp } from './otp.entity';
import { WalletModule } from 'src/wallet/wallet/wallet.module';


@Module({
  imports: [TypeOrmModule.forFeature([Otp]), UsersModule, WalletModule],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
