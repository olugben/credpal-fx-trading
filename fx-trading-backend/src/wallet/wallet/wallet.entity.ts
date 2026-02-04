import { User } from "src/users/user.entity";
import { WalletBalance } from "./wallet-balance.entity";
import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  OneToOne, 
  OneToMany,
  JoinColumn, 
  CreateDateColumn, 
  UpdateDateColumn 
} from "typeorm";

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @OneToOne(() => User, user => user.wallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => WalletBalance, balance => balance.wallet)
  balances: WalletBalance[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}