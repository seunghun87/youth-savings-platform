const supabase = require('../config/database');
const { calculateMaturityAmount } = require('./calculationService');

async function getRecommendations({ monthly_amount, period_months, age, personal_income, income_bracket }) {
  // 1. user_input 저장
  const { data: inputRecord, error: inputError } = await supabase
    .from('user_input')
    .insert({ monthly_amount, period_months, age, personal_income, income_bracket })
    .select()
    .single();

  if (inputError) throw inputError;

  // 2. 전체 상품 조회
  const { data: products, error: productError } = await supabase
    .from('savings_product')
    .select('*');

  if (productError) throw productError;

  // 3. 자격 필터링
  const eligible = products.filter((p) => {
    if (p.min_age !== null && age < p.min_age) return false;
    if (p.max_age !== null && age > p.max_age) return false;
    if (p.income_limit !== null && personal_income > p.income_limit) return false;
    return true;
  });

  // 4. 기본금리 높은 순 정렬
  eligible.sort((a, b) => b.base_rate - a.base_rate);

  // 5. 만기 수령액 계산 및 소득분위 조건 안내 태깅
  const recommendations = eligible.map((p, index) => {
    const expected_amount = calculateMaturityAmount(monthly_amount, period_months, p.base_rate);
    const needsIncomeBracketCheck = p.income_limit === null && income_bracket === undefined;

    return {
      rank: index + 1,
      name: p.name,
      bank: p.bank,
      base_rate: p.base_rate,
      period_months: p.period_months,
      max_amount: p.max_amount,
      product_type: p.product_type,
      source: p.source,
      expected_amount,
      notice: needsIncomeBracketCheck ? '소득분위 조건 있음 (직접 확인 필요)' : null,
    };
  });

  // 6. recommendation 저장
  const rows = recommendations.map((r) => ({
    input_id: inputRecord.id,
    product_id: eligible[r.rank - 1].id,
    expected_amount: r.expected_amount,
    rank: r.rank,
  }));

  if (rows.length > 0) {
    const { error: recError } = await supabase.from('recommendation').insert(rows);
    if (recError) throw recError;
  }

  return recommendations;
}

module.exports = { getRecommendations };
