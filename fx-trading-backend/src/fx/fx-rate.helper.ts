
import { Currency } from 'src/common/enums/currency.enum';

export function calculateRate(
  rates: Record<string, number>,
  from: Currency,
  to: Currency,
  baseCurrency: string,
): number {
  if (from === to) return 1;

  const directKey = `${from}_${to}`;
  if (rates[directKey]) {
    return rates[directKey];
  }

  
  const fromToBase = rates[`${from}_${baseCurrency}`];
  const baseToTarget = rates[`${baseCurrency}_${to}`];

  if (!fromToBase || !baseToTarget) {
    throw new Error(`No FX path for ${from} → ${to}`);
  }

  return fromToBase * baseToTarget;
}
