import { Currency } from "src/common/enums/currency.enum";
import { TransactionType } from "src/common/enums/transaction-type.enum";
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType; // FUND, CONVERT, TRADE

  @Column({ type: 'enum', enum: Currency })
  fromCurrency: Currency;

  @Column({ type: 'enum', enum: Currency, nullable: true })
  toCurrency: Currency;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: string;

  @Column({ type: 'decimal', precision: 18, scale: 6, nullable: true })
  rate: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ default: 'SUCCESS' })
  status: string;
}
