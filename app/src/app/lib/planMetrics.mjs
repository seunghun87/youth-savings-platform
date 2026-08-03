export const ACTIVE_STATUSES = new Set(["신청중", "신청완료", "가입완료"]);

export function afterTaxInterestFromGross(grossInterest, taxRate = 0.154) {
  const pretaxInterest = Math.max(0, Math.floor(Number(grossInterest) || 0));
  const tax = Math.floor(pretaxInterest * Math.max(0, Number(taxRate) || 0));
  return { pretaxInterest, tax, afterTaxInterest: pretaxInterest - tax };
}

export function monthDiff(from, to) {
  if (!from || !to) return 0;
  const [fromYear, fromMonth] = from.slice(0, 7).split("-").map(Number);
  const [toYear, toMonth] = to.slice(0, 7).split("-").map(Number);
  if (![fromYear, fromMonth, toYear, toMonth].every(Number.isFinite)) return 0;
  return Math.max(0, (toYear - fromYear) * 12 + toMonth - fromMonth);
}

export function estimatedAfterTaxInterest(monthly, annualRate, remainingMonths) {
  const payment = Math.max(0, Number(monthly) || 0);
  const rate = Math.max(0, Number(annualRate) || 0);
  const months = Math.max(0, Number(remainingMonths) || 0);
  const gross = payment * (rate / 100 / 12) * (months * (months + 1) / 2);
  return afterTaxInterestFromGross(gross).afterTaxInterest;
}

export function remainingPaymentPrincipal(monthly, paidThisMonth, remainingMonths) {
  const payment = Math.max(0, Number(monthly) || 0);
  const paid = Math.max(0, Number(paidThisMonth) || 0);
  const futureMonths = Math.max(0, Number(remainingMonths) || 0);
  // monthDiff(현재월, 만기월)는 이번 달 회차를 포함한 남은 납입 횟수다.
  // 따라서 이번 달 납입액을 한 회차 더 더하지 않고, 이미 낸 금액만 차감한다.
  return Math.max(0, payment * futureMonths - Math.min(payment, paid));
}

/** 현재 원금과 이번 달 잔여 납입액까지 포함한 만기 전 예상 세후 이자. */
export function estimatedAccountAfterTaxInterest({ balance, monthly, paidThisMonth, annualRate, remainingMonths }) {
  const principal = Math.max(0, Number(balance) || 0);
  const payment = Math.max(0, Number(monthly) || 0);
  const paid = Math.max(0, Number(paidThisMonth) || 0);
  const rate = Math.max(0, Number(annualRate) || 0) / 100 / 12;
  const futureMonths = Math.max(0, Number(remainingMonths) || 0);
  const outstanding = Math.max(0, payment - Math.min(payment, paid));
  // 현재 원금과 이번 달 잔여 납입액은 남은 전체 기간 동안,
  // 다음 달 이후 납입액은 (n-1)개월부터 1개월까지 이자가 붙는다.
  const laterPaymentMonths = Math.max(0, futureMonths - 1);
  const gross = principal * rate * futureMonths
    + outstanding * rate * futureMonths
    + payment * rate * (laterPaymentMonths * (laterPaymentMonths + 1) / 2);
  return afterTaxInterestFromGross(gross).afterTaxInterest;
}

export function accountProjectedValue(account) {
  const futurePrincipal = Number.isFinite(Number(account.futurePrincipal))
    ? Math.max(0, Number(account.futurePrincipal))
    : remainingPaymentPrincipal(account.monthly, account.paid, account.remainingMonths);
  return Math.max(0, Number(account.balance) || 0)
    + futurePrincipal
    + Math.max(0, Number(account.interest) || 0)
    + Math.max(0, Number(account.support) || 0);
}

export function calculatePlanMetrics({ target, current, unallocated, accounts }) {
  const safeTarget = Math.max(1, Number(target) || 0);
  const safeCurrent = Math.max(0, Number(current) || 0);
  const activeAccounts = accounts.filter(account => ACTIVE_STATUSES.has(account.status));
  const allocated = activeAccounts.reduce((sum, account) => sum + Math.max(0, Number(account.monthly) || 0), 0);
  const budget = Math.max(0, Number(unallocated) || 0) + allocated;
  const paid = activeAccounts.reduce((sum, account) => sum + Math.max(0, Number(account.paid) || 0), 0);
  const futurePrincipal = activeAccounts.reduce((sum, account) => sum + (Number.isFinite(Number(account.futurePrincipal))
    ? Math.max(0, Number(account.futurePrincipal))
    : remainingPaymentPrincipal(account.monthly, account.paid, account.remainingMonths)), 0);
  const totalInterest = activeAccounts.reduce((sum, account) => sum + Math.max(0, Number(account.interest) || 0), 0);
  const totalSupport = activeAccounts.reduce((sum, account) => sum + Math.max(0, Number(account.support) || 0), 0);
  const remaining = Math.max(0, safeTarget - safeCurrent);
  const baseMonths = remaining === 0 ? 0 : budget > 0 ? Math.ceil(remaining / budget) : null;
  return {
    target: safeTarget,
    current: safeCurrent,
    activeAccounts,
    allocated,
    budget,
    paid,
    futurePrincipal,
    totalInterest,
    totalSupport,
    expectedAssets: safeCurrent + futurePrincipal + totalInterest + totalSupport,
    remaining,
    baseMonths,
    progressPercent: Math.min(100, safeCurrent / safeTarget * 100),
  };
}

export function accountProgressPercent(paidMonths, totalMonths) {
  if (!totalMonths || totalMonths <= 0) return 0;
  return Math.min(100, Math.max(0, paidMonths) / totalMonths * 100);
}
