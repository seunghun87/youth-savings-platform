const supabase = require('./supabaseClient');

// 만기 수령액 계산 (단위: 원)
// monthly_amount는 만원 단위로 입력받음
function calcExpectedAmount(monthly_amount, period_months, base_rate) {
  const monthly_won = monthly_amount * 10000;
  return Math.round(monthly_won * period_months * (1 + (base_rate / 100) * (period_months / 12)));
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
    (p.income_limit === null || personal_income <= p.income_limit)
  );

  eligible.sort((a, b) => b.base_rate - a.base_rate);

  const results = eligible.map((p, i) => ({
    id: p.id,
    name: p.name,
    bank: p.bank,
    base_rate: Number(p.base_rate),
    expected_amount: calcExpectedAmount(monthly_amount, period_months, p.base_rate),
    rank: i + 1,
    notice: p.income_limit ? `연소득 ${p.income_limit.toLocaleString()}만원 이하 조건 있음` : null,
  }));

  // 사용자 입력 저장
  const { data: inputRow, error: inputErr } = await supabase
    .from('user_input')
    .insert({ monthly_amount, period_months, age, personal_income, income_bracket })
    .select()
    .single();
  if (inputErr) throw inputErr;

  // 추천 결과 저장
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

  // id 필드는 응답에서 제거
  return results.map(({ id, ...rest }) => rest);
}

module.exports = { getRecommendations };
