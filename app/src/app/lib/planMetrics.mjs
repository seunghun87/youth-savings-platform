export const ACTIVE_STATUSES = new Set(["신청중", "신청완료", "가입완료"]);

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
  return Math.floor(payment * (rate / 100 / 12) * (months * (months + 1) / 2) * (1 - 0.154));
}

export function calculatePlanMetrics({ target, current, unallocated, accounts }) {
  const safeTarget = Math.max(1, Number(target) || 0);
  const safeCurrent = Math.max(0, Number(current) || 0);
  const activeAccounts = accounts.filter(account => ACTIVE_STATUSES.has(account.status));
  const allocated = activeAccounts.reduce((sum, account) => sum + Math.max(0, Number(account.monthly) || 0), 0);
  const budget = Math.max(0, Number(unallocated) || 0) + allocated;
  const paid = activeAccounts.reduce((sum, account) => sum + Math.max(0, Number(account.paid) || 0), 0);
  const futurePrincipal = activeAccounts.reduce((sum, account) => sum + Math.max(0, Number(account.monthly) || 0) * Math.max(0, Number(account.remainingMonths) || 0), 0);
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
