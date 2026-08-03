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
export function afterTaxInterestFromGross(grossInterest:unknown,taxRate?:unknown): { pretaxInterest:number;tax:number;afterTaxInterest:number };
export function estimatedAfterTaxInterest(monthly: unknown, annualRate: unknown, remainingMonths: unknown): number;
export function remainingPaymentPrincipal(monthly: unknown, paidThisMonth: unknown, remainingMonths: unknown): number;
export function estimatedAccountAfterTaxInterest(input: { balance:unknown; monthly:unknown; paidThisMonth:unknown; annualRate:unknown; remainingMonths:unknown }): number;
export function accountProjectedValue(account: Partial<PlanMetricAccount> & { balance?:number }): number;
export function buildAccountSnapshot(input: {
  product: { product_name:string;opening_balance?:number;monthly_amount?:number|null;interest_rate?:number|null;started_at?:string|null;matures_at?:string|null;status:string };
  contributions: Array<{product_name:string;amount:number;contributed_at:string}>;
  currentMonth:string;currentDate:string;
}): { balance:number;paid:number;monthly:number;status:string;totalMonths:number|null;paidMonths:number;remainingMonths:number;futurePrincipal:number;interest:number;projectionAvailable:boolean };
export function accountProgressPercent(paidMonths: number, totalMonths: number | null): number;
export function calculatePlanMetrics<T extends PlanMetricAccount>(input: { target:number; current:number; unallocated:number; accounts:T[] }): {
  target:number;current:number;activeAccounts:T[];allocated:number;budget:number;paid:number;
  futurePrincipal:number;totalInterest:number;totalSupport:number;expectedAssets:number;remaining:number;
  baseMonths:number|null;progressPercent:number;
};
