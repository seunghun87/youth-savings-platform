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

export function remainingScheduledPrincipal(monthly, totalMonths, currentPrincipal) {
  const payment=Math.max(0,Number(monthly)||0);
  const installments=Math.max(0,Number(totalMonths)||0);
  const principal=Math.max(0,Number(currentPrincipal)||0);
  return Math.max(0,payment*installments-principal);
}

export function estimatedProjectionAfterTaxInterest({ balance, monthly, paidThisMonth, annualRate, remainingMonths, futurePrincipal }) {
  const principal=Math.max(0,Number(balance)||0);
  const payment=Math.max(0,Number(monthly)||0);
  const paid=Math.max(0,Number(paidThisMonth)||0);
  const months=Math.max(0,Number(remainingMonths)||0);
  const rate=Math.max(0,Number(annualRate)||0)/100/12;
  let future=Math.max(0,Number(futurePrincipal)||0);
  const currentOutstanding=Math.min(future,Math.max(0,payment-Math.min(payment,paid)));
  let gross=(principal+currentOutstanding)*rate*months;
  future-=currentOutstanding;
  let offset=1;
  while(future>0&&offset<=months){
    const installment=Math.min(payment,future);
    gross+=installment*rate*Math.max(0,months-offset);
    future-=installment;
    offset+=1;
  }
  return afterTaxInterestFromGross(gross).afterTaxInterest;
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

export function buildAccountSnapshot({ product, contributions, currentMonth, currentDate }) {
  const rows = (contributions ?? []).filter(row => row.product_name === product.product_name && row.contributed_at <= currentDate);
  const balance = Math.max(0, Number(product.opening_balance) || 0)
    + rows.reduce((sum,row)=>sum+Math.max(0,Number(row.amount)||0),0);
  const paid = rows.filter(row=>row.contributed_at.slice(0,7)===currentMonth)
    .reduce((sum,row)=>sum+Math.max(0,Number(row.amount)||0),0);
  const monthly = Math.max(0, Number(product.monthly_amount) || 0);
  const hasMaturity = Boolean(product.matures_at);
  const projectionAvailable = hasMaturity && Boolean(product.started_at);
  const maturityPassed = hasMaturity && product.matures_at < currentDate;
  const status = maturityPassed && ACTIVE_STATUSES.has(product.status) ? "만기완료" : product.status;
  const totalMonths = hasMaturity && product.started_at ? Math.max(1, monthDiff(product.started_at, product.matures_at)) : null;
  const paidMonths = new Set(rows.map(row=>row.contributed_at.slice(0,7))).size;
  const remainingMonths = projectionAvailable && !maturityPassed ? monthDiff(currentMonth,product.matures_at) : 0;
  const active = ACTIVE_STATUSES.has(status);
  // 약정 총회차와 실제로 남은 달 중 더 작은 범위만 미래 납입으로 잡는다.
  // 이 제한이 없으면 13회 상품을 14회 납입하는 것처럼 표시될 수 있다.
  const scheduledRemaining = remainingScheduledPrincipal(monthly,totalMonths,balance);
  const calendarRemaining = remainingPaymentPrincipal(monthly,paid,remainingMonths);
  const futurePrincipal = active && projectionAvailable ? Math.min(scheduledRemaining,calendarRemaining) : 0;
  const interest = active && projectionAvailable ? estimatedProjectionAfterTaxInterest({balance,monthly,paidThisMonth:paid,annualRate:product.interest_rate,remainingMonths,futurePrincipal}) : 0;
  return { balance,paid,monthly,status,totalMonths,paidMonths,remainingMonths,futurePrincipal,interest,projectionAvailable };
}

export function reconcileCurrentAssets(storedCurrent, products, contributions, currentDate) {
  const tracked = (products ?? []).filter(product=>product.status!=="중도해지");
  const names = new Set(tracked.map(product=>product.product_name));
  const opening = tracked.reduce((sum,product)=>sum+Math.max(0,Number(product.opening_balance)||0),0);
  const recorded = (contributions ?? [])
    .filter(row=>names.has(row.product_name)&&row.contributed_at<=currentDate)
    .reduce((sum,row)=>sum+Math.max(0,Number(row.amount)||0),0);
  return Math.max(0,Number(storedCurrent)||0,opening+recorded);
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
