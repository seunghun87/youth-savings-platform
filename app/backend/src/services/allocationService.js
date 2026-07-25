const supabase = require('./supabaseClient');
const { calculateMaturityAmount } = require('./calculationService');

// 사용자 목표 기간에 적용할 금리 선택 (recommendService.pickRate와 동일 규칙)
function pickRate(product, periodMonths) {
  const options = Array.isArray(product.options) ? product.options : null;
  if (!options || options.length === 0) return Number(product.base_rate);

  const applicable = options.filter(o => o.term <= periodMonths);
  if (applicable.length === 0) return null;
  return Math.max(...applicable.map(o => o.rate));
}

// 그리디 배분: 금리 높은 상품부터 월 한도까지 채우고, 남은 예산을 다음 상품으로 넘긴다.
// 단리 + 월한도 제약에서는 그리디가 최적(또는 최적에 매우 근접)이라 knapsack(DP)까지 갈 필요 없음.
async function allocateSavings({ monthly_amount, period_months, age, personal_income }) {
  const { data: products, error } = await supabase
    .from('savings_product')
    .select('*');
  if (error) throw error;

  // 월 한도(monthly_limit)는 여기서 필터링 기준으로 쓰지 않는다.
  // 배분 단계에서 상품별 한도까지만 나눠 담을 것이므로, 자격 자체는 나이/소득/기간만 본다.
  const eligible = products.filter(p =>
    age >= p.min_age &&
    age <= p.max_age &&
    period_months >= p.min_period &&
    period_months <= p.max_period &&
    (p.income_limit === null || personal_income <= p.income_limit)
  );

  const candidates = eligible
    .map(p => ({ product: p, rate: pickRate(p, period_months) }))
    .filter(c => c.rate !== null)
    .sort((a, b) => b.rate - a.rate);

  let remaining = monthly_amount; // 만원 단위
  const allocations = [];

  for (const { product, rate } of candidates) {
    if (remaining <= 0) break;
    const limit = product.monthly_limit ?? Infinity;
    const amount = Math.min(remaining, limit);
    if (amount <= 0) continue;

    allocations.push({
      name: product.name,
      bank: product.bank,
      base_rate: rate,
      monthly_allocation: amount,
      expected_amount: calculateMaturityAmount(amount * 10000, period_months, rate),
    });
    remaining -= amount;
  }

  return {
    allocations,
    total_monthly_allocated: monthly_amount - remaining,
    // 자격 통과 상품의 한도를 다 채워도 못 담은 금액. 0보다 크면 UI에 안내 필요
    unallocated_amount: remaining,
    total_expected_amount: allocations.reduce((sum, a) => sum + a.expected_amount, 0),
  };
}

module.exports = { allocateSavings };
