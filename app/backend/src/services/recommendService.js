const supabase = require('./supabaseClient');
const { calculateMaturityAmount } = require('./calculationService');

// 사용자 목표 기간에 적용할 금리 선택.
// finlife 상품은 기간별 옵션 중 "목표 기간 이하에서 가장 높은 금리"를 사용하고,
// 옵션이 없는 상품(manual 정책 상품)은 base_rate를 그대로 사용한다.
// 목표 기간에 맞는 옵션이 하나도 없으면 null 반환(추천 제외).
function pickRate(product, periodMonths) {
  const options = Array.isArray(product.options) ? product.options : null;
  if (!options || options.length === 0) return Number(product.base_rate);

  const selectedTerm = Math.min(periodMonths, Number(product.max_period));
  const applicable = options.filter(o => o.term <= selectedTerm);
  if (applicable.length === 0) return null;
  const longestTerm = Math.max(...applicable.map(o => o.term));
  return Math.max(...applicable.filter(o => o.term === longestTerm).map(o => o.rate));
}

function pickCalculationPeriod(product, periodMonths) {
  const options = Array.isArray(product.options) ? product.options : [];
  if (!options.length) return Math.min(periodMonths, Number(product.max_period));
  const applicable = options.filter(o => o.term <= Math.min(periodMonths, Number(product.max_period)));
  return applicable.length ? Math.max(...applicable.map(o => o.term)) : null;
}

function evaluateProduct(product, input) {
  const checks = [
    {
      key: 'age',
      label: `나이 ${product.min_age}~${product.max_age}세`,
      met: input.age >= product.min_age && input.age <= product.max_age,
    },
    {
      key: 'period',
      label: `목표 기간 안에서 ${product.min_period}~${product.max_period}개월 운용`,
      met: input.period_months >= product.min_period,
    },
    {
      key: 'income',
      label: product.income_limit
        ? `연소득 ${Number(product.income_limit).toLocaleString()}만원 이하`
        : '소득 제한 없음',
      met:
        product.income_limit === null ||
        input.personal_income <= product.income_limit,
    },
    {
      key: 'monthly',
      label: product.monthly_limit
        ? `월 납입 ${Number(product.monthly_limit).toLocaleString()}만원 이하`
        : '월 납입 한도 없음',
      met:
        product.monthly_limit === null ||
        input.monthly_amount <= product.monthly_limit,
    },
  ];

  if (product.name.includes('주택드림')) {
    checks.push({ key: 'housing', label: '무주택자', met: input.is_homeowner === false });
    checks.push({ key: 'income_reported', label: '직전년도 신고소득 있음', met: input.income_reported === true });
  }

  const failed = checks.filter(check => !check.met);
  const eligibilityScore = Math.round(
    (checks.filter(check => check.met).length / checks.length) * 100,
  );

  return {
    checks,
    failed,
    eligibilityScore,
    eligible: failed.length === 0,
  };
}

function governmentContribution(product, monthlyWon, months, personalIncome) {
  if (!product.name.includes('청년도약계좌') || personalIncome > 6000) return 0;
  const bracket = personalIncome <= 2400 ? [400000, .06]
    : personalIncome <= 3600 ? [500000, .046]
    : personalIncome <= 4800 ? [600000, .037]
    : [700000, .03];
  const eligiblePayment = Math.min(monthlyWon, 700000);
  const baseContribution = Math.min(eligiblePayment, bracket[0]) * bracket[1];
  const expandedContribution = Math.max(0, eligiblePayment - bracket[0]) * .03;
  return Math.floor((baseContribution + expandedContribution) * months);
}

function buildRecommendationReason(product, rate, input) {
  const reasons = [];
  if (product.product_type === '정책') reasons.push('정부지원 상품');
  if (rate >= 5) reasons.push(`연 ${rate.toFixed(2)}% 수준의 높은 금리`);
  if (product.max_period === input.period_months) reasons.push('목표 기간과 정확히 일치');
  else if (input.period_months >= product.min_period) reasons.push('목표 기간 안에 운용 가능');
  if (product.monthly_limit === null || input.monthly_amount <= product.monthly_limit) {
    reasons.push('희망 월 납입액 수용');
  }
  return reasons.slice(0, 3);
}

// 추천 이력 저장. 로깅 목적이므로 실패해도 추천 응답을 막지 않는다.
async function saveHistory(input, results) {
  try {
    const { data: inputRow, error: inputErr } = await supabase
      .from('user_input')
      .insert(input)
      .select()
      .single();
    if (inputErr) throw inputErr;

    if (results.length > 0) {
      const recRows = results.map(r => ({
        user_input_id: inputRow.id,
        product_id: r.id,
        rank: r.rank,
        expected_amount: r.expected_amount,
        notice: r.notice,
      }));
      const { error: recErr } = await supabase.from('recommendation').insert(recRows);
      if (recErr) throw recErr;
    }
  } catch (err) {
    console.error('[추천 이력 저장 실패]', err);
  }
}

async function getRecommendations({ monthly_amount, period_months, age, personal_income, income_bracket, is_homeowner, income_reported }) {
  const { data: products, error } = await supabase
    .from('savings_product')
    .select('*')
    .eq('available_for_signup', true);

  if (error) throw error;

  const input = { monthly_amount, period_months, age, personal_income, is_homeowner, income_reported };
  const candidates = products
    .map(p => ({
      product: p,
      evaluation: evaluateProduct(p, input),
      rate: pickRate(p, period_months),
      calculationMonths: pickCalculationPeriod(p, period_months),
    }))
    .filter(c => c.evaluation.eligible)
    .filter(c => c.rate !== null);

  candidates.sort((a, b) => {
    if (a.product.product_type !== b.product.product_type) {
      return a.product.product_type === '정책' ? -1 : 1;
    }
    return b.rate - a.rate;
  });

  const results = candidates.map(({ product: p, rate, evaluation, calculationMonths }, i) => {
    const calculation = calculateMaturityAmount(monthly_amount * 10000, calculationMonths, rate);
    const contribution = governmentContribution(p, monthly_amount * 10000, calculationMonths, personal_income);
    return ({
    id: p.id,
    name: p.name,
    bank: p.bank,
    product_type: p.product_type,
    base_rate: rate,
    expected_amount: calculation.maturityAmount + contribution,
    principal: calculation.principal,
    aftertax_interest: calculation.aftertaxInterest,
    government_contribution: contribution,
    calculation_period_months: calculationMonths,
    rank: i + 1,
    notice: p.income_limit ? `연소득 ${p.income_limit.toLocaleString()}만원 이하 조건 있음` : null,
    eligibility_status: 'eligible',
    eligibility_score: evaluation.eligibilityScore,
    checks: evaluation.checks,
    recommendation_reasons: buildRecommendationReason(p, rate, input),
    data_source: p.source,
  }); });

  await saveHistory({ monthly_amount, period_months, age, personal_income, income_bracket }, results);

  return results;
}

module.exports = { getRecommendations };
