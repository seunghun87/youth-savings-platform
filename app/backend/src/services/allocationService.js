const supabase = require('./supabaseClient');
const { calculateMaturityAmount } = require('./calculationService');
const { pickTerm, meetsBaseEligibility, isYouthJoinable } = require('./productRules');

// 그리디 배분: 금리 높은 상품부터 월 한도까지 채우고, 남은 예산을 다음 상품으로 넘긴다.
// 단리 + 월한도 제약에서는 그리디가 최적(또는 최적에 매우 근접)이라 knapsack(DP)까지 갈 필요 없음.
async function allocateSavings({ monthly_amount, period_months, age, personal_income }) {
  // 가입 가능한 상품만 배분한다. 판매가 끝난 상품(청년희망적금 등)까지 담으면
  // 사용자가 실제로는 가입할 수 없는 플랜이 나온다. (/api/products, /api/recommend와 동일 기준)
  const { data: products, error } = await supabase
    .from('savings_product')
    .select('*')
    .eq('available_for_signup', true);
  if (error) throw error;

  // 월 한도(monthly_limit)는 여기서 필터링 기준으로 쓰지 않는다.
  // 배분 단계에서 상품별 한도까지만 나눠 담을 것이므로, 자격 자체는 나이/소득/기간만 본다.
  const candidates = products
    .filter(isYouthJoinable)
    .filter(p => meetsBaseEligibility(p, { age, period_months, personal_income }))
    .map(p => ({ product: p, term: pickTerm(p, period_months) }))
    .filter(c => c.term !== null)
    .sort((a, b) => b.term.rate - a.term.rate);

  let remaining = monthly_amount; // 만원 단위
  const allocations = [];

  for (const { product, term } of candidates) {
    if (remaining <= 0) break;
    const limit = product.monthly_limit ?? Infinity;
    const amount = Math.min(remaining, limit);
    if (amount <= 0) continue;

    // 만기 계산 기간은 목표 기간이 아니라 실제로 적용되는 옵션 기간(term.months)을 쓴다.
    // 목표 기간을 그대로 넣으면 6개월 옵션 금리로 60개월치 이자를 계산하는 과대계상이 생긴다.
    const calculation = calculateMaturityAmount(amount * 10000, term.months, term.rate);
    allocations.push({
      name: product.name,
      bank: product.bank,
      base_rate: term.rate,
      monthly_allocation: amount,
      calculation_period_months: term.months,
      expected_amount: calculation.maturityAmount,
      principal: calculation.principal,
      aftertax_interest: calculation.aftertaxInterest,
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
