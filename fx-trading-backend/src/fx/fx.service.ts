// src/fx/fx.service.ts
import {
  Injectable,
  ServiceUnavailableException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Currency } from 'src/common/enums/currency.enum';
import { lastValueFrom } from 'rxjs';

import { Redis } from 'ioredis';
import { calculateRate } from './fx-rate.helper';

@Injectable()
export class FxService {
  private readonly cacheTTL: number;
  private readonly apiUrl: string;
  private readonly baseCurrency: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  @Inject('REDIS_CLIENT') private readonly redis: Redis,

  ) {
    this.cacheTTL =
      this.configService.get<number>('FX_CACHE_TTL_MINUTES', 5) * 60;
    this.apiUrl = this.configService.get<string>(
      'FX_API_URL',
      'https://open.er-api.com/v6/latest',
    );
    this.baseCurrency = this.configService.get<string>(
      'FX_BASE_CURRENCY',
      'NGN',
    );
  }

  private async fetchRates(): Promise<Record<string, number>> {
    const cached = await this.redis.get('fx_rates');
    if (cached) {
      return JSON.parse(cached);
    }

    try {
      const response$ = this.httpService.get(
        `${this.apiUrl}/${this.baseCurrency}`,
      );
      const response = await lastValueFrom(response$);
      const data = response.data;

      const rates: Record<string, number> = {};
      for (const [currency, rate] of Object.entries(data.rates)) {
        rates[`${this.baseCurrency}_${currency}`] = rate as number;
        rates[`${currency}_${this.baseCurrency}`] = 1 / (rate as number);
      }

      await this.redis.set(
        'fx_rates',
        JSON.stringify(rates),
        'EX',
        this.cacheTTL,
      );

      return rates;
    } catch (err) {
      console.error('FX fetch failed', err);
      throw new ServiceUnavailableException(
        'Exchange rate service temporarily unavailable',
      );
    }
  }

  async getRate(from: Currency, to: Currency): Promise<number> {
    const rates = await this.fetchRates();

    try {
      return calculateRate(rates, from, to, this.baseCurrency);
    } catch {
      throw new NotFoundException(
        `Exchange rate not available for ${from}/${to}`,
      );
    }
  }

  async getAllRates(): Promise<Record<string, number>> {
    return this.fetchRates();
  }
}
