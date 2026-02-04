import { Wallet } from 'src/wallet/wallet/wallet.entity';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ default: false })
  isVerified: boolean;

  @OneToOne(() => Wallet, wallet => wallet.user)
  wallet: Wallet;

  @CreateDateColumn()
  createdAt: Date;
}
