export interface PlanMetricAccount {
  status: string;
  monthly: number;
  paid: number;
  remainingMonths: number;
  interest: number;
  support: number;
  balance?: number;
  futurePrincipal?: number;
  [key: string]: unknown;
}
export function monthDiff(from: string, to: string): number;
export function estimatedAfterTaxInterest(monthly: unknown, annualRate: unknown, remainingMonths: unknown): number;
export function remainingPaymentPrincipal(monthly: unknown, paidThisMonth: unknown, remainingMonths: unknown): number;
export function estimatedAccountAfterTaxInterest(input: { balance:unknown; monthly:unknown; paidThisMonth:unknown; annualRate:unknown; remainingMonths:unknown }): number;
export function accountProjectedValue(account: Partial<PlanMetricAccount> & { balance?:number }): number;
export function accountProgressPercent(paidMonths: number, totalMonths: number | null): number;
export function calculatePlanMetrics<T extends PlanMetricAccount>(input: { target:number; current:number; unallocated:number; accounts:T[] }): {
  target:number;current:number;activeAccounts:T[];allocated:number;budget:number;paid:number;
  futurePrincipal:number;totalInterest:number;totalSupport:number;expectedAssets:number;remaining:number;
  baseMonths:number|null;progressPercent:number;
};
