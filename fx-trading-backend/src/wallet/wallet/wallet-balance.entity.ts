import { Currency } from "src/common/enums/currency.enum";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { Wallet } from "./wallet.entity";

@Entity('wallet_balances')
@Unique(['wallet', 'currency'])
export class WalletBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  walletId: string;  

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'walletId' })  
  wallet: Wallet;

  @Column({ type: 'enum', enum: Currency })
  currency: Currency;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  balance: string;
}