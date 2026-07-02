const supabase = require('./supabaseClient');
const { calculateMaturityAmount } = require('./calculationService');

// 사용자 목표 기간에 적용할 금리 선택.
// finlife 상품은 기간별 옵션 중 "목표 기간 이하에서 가장 높은 금리"를 사용하고,
// 옵션이 없는 상품(manual 정책 상품)은 base_rate를 그대로 사용한다.
// 목표 기간에 맞는 옵션이 하나도 없으면 null 반환(추천 제외).
function pickRate(product, periodMonths) {
  const options = Array.isArray(product.options) ? product.options : null;
  if (!options || options.length === 0) return Number(product.base_rate);

  const applicable = options.filter(o => o.term <= periodMonths);
  if (applicable.length === 0) return null;
  return Math.max(...applicable.map(o => o.rate));
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

async function getRecommendations({ monthly_amount, period_months, age, personal_income, income_bracket }) {
  const { data: products, error } = await supabase
    .from('savings_product')
    .select('*');

  if (error) throw error;

  const eligible = products.filter(p =>
    age >= p.min_age &&
    age <= p.max_age &&
    period_months >= p.min_period &&
    period_months <= p.max_period &&
    (p.income_limit === null || personal_income <= p.income_limit) &&
    (p.monthly_limit === null || monthly_amount <= p.monthly_limit)
  );

  const candidates = eligible
    .map(p => ({ product: p, rate: pickRate(p, period_months) }))
    .filter(c => c.rate !== null);

  candidates.sort((a, b) => b.rate - a.rate);

  const results = candidates.map(({ product: p, rate }, i) => ({
    id: p.id,
    name: p.name,
    bank: p.bank,
    base_rate: rate,
    expected_amount: calculateMaturityAmount(monthly_amount * 10000, period_months, rate),
    rank: i + 1,
    notice: p.income_limit ? `연소득 ${p.income_limit.toLocaleString()}만원 이하 조건 있음` : null,
  }));

  await saveHistory({ monthly_amount, period_months, age, personal_income, income_bracket }, results);

  // id 필드는 응답에서 제거
  return results.map(({ id, ...rest }) => rest);
}

module.exports = { getRecommendations };
