// src/transactions/transactions.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from './transactions.entity';


@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
    
  ) {}

  async createTransaction(data: Partial<Transaction>) {
    const txn = this.transactionRepo.create(data);
    return this.transactionRepo.save(txn);
  }

  async getUserTransactions(userId: string) {
    return this.transactionRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
