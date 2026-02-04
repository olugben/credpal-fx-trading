// src/fx/fx.service.ts
import { Injectable, ServiceUnavailableException, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Currency } from 'src/common/enums/currency.enum';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class FxService {
  private rates: Record<string, number> = {}; 
  private lastUpdated: number = 0; 
  private cacheTTL = 5 * 60 * 1000; 

  constructor(private readonly httpService: HttpService) {}

  
  private async fetchRates(): Promise<void> {
    
    const now = Date.now();
    if (now - this.lastUpdated < this.cacheTTL && Object.keys(this.rates).length) {
      return; 
    }

    try {
      
      const response$ = this.httpService.get(
        `https://open.er-api.com/v6/latest/NGN`, 
      );
      const response = await lastValueFrom(response$);
      const data = response.data;

    
      this.rates = {};
      for (const [currency, rate] of Object.entries(data.rates)) {
    
        this.rates[`NGN_${currency}`] = rate as number;
        this.rates[`${currency}_NGN`] = 1 / (rate as number); // reverse rate
      }

      this.lastUpdated = now;
    } catch (err) {
      console.error('Failed to fetch FX rates:', err);
      throw new ServiceUnavailableException('Exchange rate service temporarily unavailable'); // ← CHANGED
    }
  }

  
  async getRate(from: Currency, to: Currency): Promise<number> {
    if (from === to) return 1;

    await this.fetchRates();
    const key = `${from}_${to}`;
    const rate = this.rates[key];
    if (!rate) throw new NotFoundException(`Exchange rate not available for ${from}/${to}`); 
    return rate;
  }

  
  async getAllRates(): Promise<Record<string, number>> {
    await this.fetchRates();
    return this.rates;
  }
}