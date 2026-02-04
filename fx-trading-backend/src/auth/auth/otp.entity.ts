
import { User } from 'src/users/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

import { ManyToOne } from 'typeorm';

@Entity('otps')
export class Otp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  user: User;

  @Column()
  code: string; // the OTP itself

  @Column({ type: 'timestamptz' })
  expiresAt: Date; // OTP expiration

  @CreateDateColumn()
  createdAt: Date;
}
