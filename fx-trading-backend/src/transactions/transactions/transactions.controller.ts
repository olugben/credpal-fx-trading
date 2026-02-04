// src/transactions/transactions.controller.ts
import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { User } from 'src/users/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  @Get()
  async getTransactions(@Query('email') email: string) {
    if (!email) throw new BadRequestException('Email is required');

    
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) throw new BadRequestException('User not found');

    
    return this.transactionsService.getUserTransactions(user.id);
  }
}
