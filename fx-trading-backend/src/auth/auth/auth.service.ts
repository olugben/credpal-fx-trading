import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as bcrypt from 'bcrypt';

import { User } from 'src/users/user.entity';
import { Otp } from './otp.entity';
import { WalletService } from 'src/wallet/wallet/wallet.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Otp)
    private readonly otpRepo: Repository<Otp>,
    private readonly configService: ConfigService,
      private readonly walletService: WalletService,
  ) {}

  async register(email: string) {
    let user = await this.userRepo.findOne({ where: { email } });

    if (!user) {
      user = this.userRepo.create({ email });
      await this.userRepo.save(user);
    }

    if (user.isVerified) {
      throw new ConflictException('User already verified');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hash = await bcrypt.hash(code, 10);

    const expiryMinutes =
      this.configService.get<number>('OTP_EXPIRY_MINUTES') ?? 10;

    const otp = this.otpRepo.create({
      user,
      code: hash,
      expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
    });

    await this.otpRepo.save(otp);

    try {
      await this.sendEmail(email, code);
    } catch (err) {
      throw new InternalServerErrorException(
        'Failed to send OTP email. Please try again later',
      );
    }

    return { message: 'OTP sent to your email' };
  }

  async verify(email: string, code: string) {
    const user = await this.userRepo.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException('Invalid email or OTP');
    }

    if (user.isVerified) {
      throw new ConflictException('User already verified');
    }

    const otp = await this.otpRepo.findOne({
      where: { user: { id: user.id } },
      order: { createdAt: 'DESC' },
    });

    if (!otp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    if (otp.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const isMatch = await bcrypt.compare(code, otp.code);

    if (!isMatch) {
      throw new BadRequestException('Invalid or expired OTP');
    }

  user.isVerified = true;
  await this.userRepo.save(user);

  
  await this.walletService.createWalletForUser(user);

    return { message: 'User verified successfully' };
  }

  private async sendEmail(to: string, code: string) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
    });

    await transporter.sendMail({
      from: `"FX App" <${this.configService.get<string>('EMAIL_USER')}>`,
      to,
      subject: 'Your OTP Code',
      text: `Your OTP is: ${code}`,
    });
  }
}
