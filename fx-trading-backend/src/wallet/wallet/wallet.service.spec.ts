import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import Decimal from 'decimal.js';

import { WalletService } from './wallet.service';
import { Wallet } from './wallet.entity';
import { WalletBalance } from './wallet-balance.entity';
import { User } from 'src/users/user.entity';
import { FxService } from 'src/fx/fx.service';
import { TransactionsService } from 'src/transactions/transactions/transactions.service';
import { Currency } from 'src/common/enums/currency.enum';



describe('WalletService', () => {
  let service: WalletService;

  let walletRepo: jest.Mocked<Repository<Wallet>>;
  let walletBalanceRepo: jest.Mocked<Repository<WalletBalance>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let fxService: jest.Mocked<FxService>;
  let transactionsService: jest.Mocked<TransactionsService>;
  let dataSource: DataSource;

  const mockTransaction = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: getRepositoryToken(Wallet),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(WalletBalance),
          useValue: {},
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: FxService,
          useValue: {
            getRate: jest.fn(),
          },
        },
        {
          provide: TransactionsService,
          useValue: {
            createTransaction: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: mockTransaction,
          },
        },
      ],
    }).compile();

    service = module.get(WalletService);
    walletRepo = module.get(getRepositoryToken(Wallet));
    walletBalanceRepo = module.get(getRepositoryToken(WalletBalance));
    userRepo = module.get(getRepositoryToken(User));
    fxService = module.get(FxService);
    transactionsService = module.get(TransactionsService);
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBalances', () => {
    it('should return wallet balances', async () => {
      walletRepo.findOne.mockResolvedValue({
        id: 'wallet-id',
        balances: [
          { currency: Currency.NGN, balance: '100.00' } as WalletBalance,
        ],
      } as Wallet);

      const result = await service.getBalances('user-id');

      expect(result).toHaveLength(1);
      expect(result[0].currency).toBe(Currency.NGN);
    });

    it('should throw if wallet not found', async () => {
      walletRepo.findOne.mockResolvedValue(null);

      await expect(service.getBalances('user-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('fundWallet', () => {
    it('should fund wallet successfully', async () => {
      const wallet = { id: 'wallet-id', userId: 'user-id' } as Wallet;
      const balance = {
        id: 'balance-id',
        currency: Currency.NGN,
        balance: '50.00',
      } as WalletBalance;

      mockTransaction.mockImplementation(async (cb) =>
        cb({
          findOne: jest
            .fn()
            .mockResolvedValueOnce(wallet)
            .mockResolvedValueOnce(balance),
          save: jest.fn().mockResolvedValue({
            ...balance,
            balance: '150.00',
          }),
        }),
      );

      const result = await service.fundWallet(
        'user-id',
        Currency.NGN,
        100,
      );

      expect(result.balance).toBe('150.00');
      expect(transactionsService.createTransaction).toHaveBeenCalled();
    });

    it('should throw for invalid amount', async () => {
      await expect(
        service.fundWallet('user-id', Currency.NGN, 0),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('convertCurrency', () => {
    it('should convert currency successfully', async () => {
      const wallet = { id: 'wallet-id', userId: 'user-id' } as Wallet;

      const fromBalance = {
        currency: Currency.NGN,
        balance: '1000.00',
      } as WalletBalance;

      const toBalance = {
        currency: Currency.USD,
        balance: '10.00',
      } as WalletBalance;

      fxService.getRate.mockResolvedValue(0.001);

      mockTransaction.mockImplementation(async (cb) =>
        cb({
          findOne: jest
            .fn()
            .mockResolvedValueOnce(wallet)
            .mockResolvedValueOnce(fromBalance)
            .mockResolvedValueOnce(toBalance),
          save: jest.fn(),
          create: jest.fn(),
        }),
      );

      const result = await service.convertCurrency(
        'user-id',
        Currency.NGN,
        Currency.USD,
        500,
      );

      expect(result.rate).toBe(0.001);
      expect(result.convertedAmount).toBe('0.50');
      expect(transactionsService.createTransaction).toHaveBeenCalled();
    });

    it('should fail when converting same currency', async () => {
      await expect(
        service.convertCurrency(
          'user-id',
          Currency.NGN,
          Currency.NGN,
          100,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should fail on insufficient balance', async () => {
      const wallet = { id: 'wallet-id', userId: 'user-id' } as Wallet;
      const fromBalance = {
        currency: Currency.NGN,
        balance: '10.00',
      } as WalletBalance;

      mockTransaction.mockImplementation(async (cb) =>
        cb({
          findOne: jest
            .fn()
            .mockResolvedValueOnce(wallet)
            .mockResolvedValueOnce(fromBalance),
        }),
      );

      await expect(
        service.convertCurrency(
          'user-id',
          Currency.NGN,
          Currency.USD,
          100,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findUserByEmail', () => {
    it('should return user', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'user-id',
        email: 'test@mail.com',
      } as User);

      const user = await service['findUserByEmail']('test@mail.com');
      expect(user.id).toBe('user-id');
    });

    it('should throw if user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service['findUserByEmail']('missing@mail.com'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
