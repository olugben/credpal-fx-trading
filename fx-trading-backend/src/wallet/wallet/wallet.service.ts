import {BadRequestException, Injectable,InternalServerErrorException,Logger,NotFoundException} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Currency } from 'src/common/enums/currency.enum';
import { TransactionType } from 'src/common/enums/transaction-type.enum';
import { TransactionStatus } from 'src/common/enums/transaction-status.enum';
import { FxService } from 'src/fx/fx.service';
import { TransactionsService } from 'src/transactions/transactions/transactions.service';
import { User } from 'src/users/user.entity';
import { DataSource, Repository } from 'typeorm';
import { WalletBalance } from './wallet-balance.entity';
import { Wallet } from './wallet.entity';
import Decimal from 'decimal.js';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,

    @InjectRepository(WalletBalance)
    private readonly walletBalanceRepo: Repository<WalletBalance>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly transactionsService: TransactionsService,
    private readonly fxService: FxService,
    private readonly dataSource: DataSource,
  ) {}


  async createWalletForUser(user: User): Promise<Wallet> {
    const existing = await this.walletRepo.findOne({
      where: { user: { id: user.id } },
    });

    if (existing) {
      return existing;
    }

    return await this.dataSource.transaction(async (manager) => {
      const wallet = manager.create(Wallet, { user });
      const savedWallet = await manager.save(wallet);

      const currencies = Object.values(Currency);
      const balances = currencies.map((currency) =>
        manager.create(WalletBalance, {
          wallet: savedWallet,
          currency,
          balance: '0.00',
        }),
      );

      await manager.save(WalletBalance, balances);

      return savedWallet;
    });
  }


  async getBalances(userId: string): Promise<WalletBalance[]> {
    const wallet = await this.walletRepo.findOne({
      where: { userId },
      relations: ['balances'],
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet.balances || [];
  }

  async getBalancesByEmail(email: string): Promise<WalletBalance[]> {
    const user = await this.findUserByEmail(email);
    return this.getBalances(user.id);
  }


  async fundWallet(
    userId: string,
    currency: Currency,
    amount: number,
  ): Promise<WalletBalance> {
    this.validateAmount(amount);

    return await this.dataSource.transaction(async (manager) => {
      const wallet = await manager.findOne(Wallet, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const balance = await manager.findOne(WalletBalance, {
        where: { walletId: wallet.id, currency },
        lock: { mode: 'pessimistic_write' },
      });

      if (!balance) {
        throw new NotFoundException(`Balance for ${currency} not found`);
      }

      const currentBalance = new Decimal(balance.balance);
      const amountDecimal = new Decimal(amount);
      balance.balance = currentBalance.plus(amountDecimal).toFixed(2);

      const savedBalance = await manager.save(WalletBalance, balance);

      
      this.logTransaction({
        userId,
        type: TransactionType.FUND,
        fromCurrency: currency,
        amount: amountDecimal.toFixed(2),
        status: TransactionStatus.SUCCESS,
      });

      return savedBalance;
    });
  }

 
  async fundWalletByEmail(
    email: string,
    currency: Currency,
    amount: number,
  ): Promise<WalletBalance> {
    const user = await this.findUserByEmail(email);
    return this.fundWallet(user.id, currency, amount);
  }

  async convertCurrency(
    userId: string,
    fromCurrency: Currency,
    toCurrency: Currency,
    amount: number,
  ): Promise<{ message: string; rate: number; convertedAmount: string }> {
    return this.exchangeCurrency(
      userId,
      fromCurrency,
      toCurrency,
      amount,
      TransactionType.CONVERT,
    );
  }

  async convertCurrencyByEmail(
    email: string,
    fromCurrency: Currency,
    toCurrency: Currency,
    amount: number,
  ): Promise<{ message: string; rate: number; convertedAmount: string }> {
    const user = await this.findUserByEmail(email);
    return this.convertCurrency(user.id, fromCurrency, toCurrency, amount);
  }

  
  
  async tradeWallet(
    userId: string,
    fromCurrency: Currency,
    toCurrency: Currency,
    amount: number,
  ): Promise<{ message: string; rate: number; convertedAmount: string }> {
    return this.exchangeCurrency(
      userId,
      fromCurrency,
      toCurrency,
      amount,
      TransactionType.TRADE,
    );
  }


  async tradeWalletByEmail(
    email: string,
    fromCurrency: Currency,
    toCurrency: Currency,
    amount: number,
  ): Promise<{ message: string; rate: number; convertedAmount: string }> {
    const user = await this.findUserByEmail(email);
    return this.tradeWallet(user.id, fromCurrency, toCurrency, amount);
  }


  private async exchangeCurrency(
    userId: string,
    fromCurrency: Currency,
    toCurrency: Currency,
    amount: number,
    transactionType: TransactionType.CONVERT | TransactionType.TRADE,
  ): Promise<{ message: string; rate: number; convertedAmount: string }> {

    this.validateAmount(amount);
    if (fromCurrency === toCurrency) {
      throw new BadRequestException('Cannot exchange the same currency');
    }


    return await this.dataSource.transaction(async (manager) => {
    
      const wallet = await manager.findOne(Wallet, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

   
      const fromBalance = await manager.findOne(WalletBalance, {
        where: { walletId: wallet.id, currency: fromCurrency },
        lock: { mode: 'pessimistic_write' },
      });

      if (!fromBalance) {
        throw new NotFoundException(`Balance for ${fromCurrency} not found`);
      }

     
      const currentBalance = new Decimal(fromBalance.balance);
      const amountDecimal = new Decimal(amount);

      if (currentBalance.lessThan(amountDecimal)) {
        throw new BadRequestException(
          `Insufficient balance. Available: ${currentBalance.toFixed(2)} ${fromCurrency}, Required: ${amountDecimal.toFixed(2)} ${fromCurrency}`,
        );
      }

  
      let toBalance = await manager.findOne(WalletBalance, {
        where: { walletId: wallet.id, currency: toCurrency },
        lock: { mode: 'pessimistic_write' },
      });

    
      const rate = await this.fxService.getRate(fromCurrency, toCurrency);
      this.validateRate(rate, fromCurrency, toCurrency);

     
      const rateDecimal = new Decimal(rate);
      const convertedAmount = amountDecimal.times(rateDecimal);


      fromBalance.balance = currentBalance.minus(amountDecimal).toFixed(2);
      await manager.save(WalletBalance, fromBalance);

  
      if (toBalance) {
        const toCurrentBalance = new Decimal(toBalance.balance);
        toBalance.balance = toCurrentBalance.plus(convertedAmount).toFixed(2);
        await manager.save(WalletBalance, toBalance);
      } else {
        toBalance = manager.create(WalletBalance, {
          wallet,
          currency: toCurrency,
          balance: convertedAmount.toFixed(2),
        });
        await manager.save(WalletBalance, toBalance);
      }


      this.logTransaction({
        userId,
        type: transactionType,
        fromCurrency,
        toCurrency,
        amount: amountDecimal.toFixed(2),
        rate: rateDecimal.toFixed(6),
        status: TransactionStatus.SUCCESS,
      });

      const action = transactionType === TransactionType.CONVERT ? 'Converted' : 'Traded';
      
      return {
        message: `${action} ${amountDecimal.toFixed(2)} ${fromCurrency} to ${convertedAmount.toFixed(2)} ${toCurrency}`,
        rate: rateDecimal.toNumber(),
        convertedAmount: convertedAmount.toFixed(2),
      };
    });
  }


  private async findUserByEmail(email: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    return user;
  }

  private validateAmount(amount: number): void {
    if (!amount || amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    if (!Number.isFinite(amount)) {
      throw new BadRequestException('Amount must be a valid number');
    }
  }

  private validateRate(
    rate: number,
    fromCurrency: Currency,
    toCurrency: Currency,
  ): void {
    if (!rate || rate <= 0 || !Number.isFinite(rate)) {
      throw new InternalServerErrorException(
        `Invalid exchange rate received for ${fromCurrency}/${toCurrency}`,
      );
    }
  }

 
  private logTransaction(data: {
    userId: string;
    type: TransactionType;
    fromCurrency: Currency;
    toCurrency?: Currency;
    amount: string;
    rate?: string;
    status: TransactionStatus;
  }): void {
    this.transactionsService
      .createTransaction({
        ...data,
        createdAt: new Date(),
      })
      .catch((error) => {
        this.logger.error(
          `Failed to log transaction for user ${data.userId}`,
          error.stack,
        );
      });
  }
}