const supabase = require('./supabaseClient');
const { calculateMaturityAmount } = require('./calculationService');
const { listYouthPolicies } = require('./youthPolicyService');

const MAX_POLICIES = 20;

const STATUS_ORDER = { '충족': 0, '확인 필요': 1, '미충족': 2 };

// 정책 정렬 우선순위: ① 충족 > 확인 필요 > 미충족 ② 나이 범위가 좁을수록(더 특정 대상 정책일수록) 상위 노출
// listYouthPolicies는 이제 미충족 정책도 사유와 함께 포함하지만, 상위 20건 안에는 사실상 충족/확인필요만 들어온다
async function getMatchingPolicies(age, personalIncome, incomeBracket) {
  const policies = await listYouthPolicies({ age, personalIncome, incomeBracket });
  return policies
    .slice()
    .sort((a, b) => {
      if (a.status !== b.status) return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      const spanA = (a.max_age ?? 999) - (a.min_age ?? 0);
      const spanB = (b.max_age ?? 999) - (b.min_age ?? 0);
      return spanA - spanB;
    })
    .slice(0, MAX_POLICIES)
    .map(({ id, ...rest }) => rest);
}

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

  // 정책 조회 실패가 추천 응답 전체를 막지 않도록 별도 처리
  const policies = await getMatchingPolicies(age, personal_income, income_bracket).catch(err => {
    console.error('[청년정책 조회 실패]', err);
    return [];
  });

  return {
    // id 필드는 응답에서 제거
    products: results.map(({ id, ...rest }) => rest),
    policies,
  };
}

module.exports = { getRecommendations };
