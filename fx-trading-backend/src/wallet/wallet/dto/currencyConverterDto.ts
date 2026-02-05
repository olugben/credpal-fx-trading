import { IsEmail, IsEnum, IsNumber, IsPositive, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Currency } from 'src/common/enums/currency.enum';

export class ConvertCurrencyDto {
  @IsEmail()
  email: string;

  @IsEnum(Currency, { message: `fromCurrency must be one of: ${Object.values(Currency).join(', ')}` })
  fromCurrency: Currency;

  @IsEnum(Currency, { message: `toCurrency must be one of: ${Object.values(Currency).join(', ')}` })
  toCurrency: Currency;

  @IsNumber()
  @IsPositive()
  @Min(0.01)
  @Type(() => Number)
  amount: number;
}