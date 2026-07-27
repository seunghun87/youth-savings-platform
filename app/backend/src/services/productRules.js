// 추천(recommendService)과 배분(allocationService)이 공유하는 상품 자격·금리 규칙.
// 두 엔드포인트가 같은 상품에 대해 다른 답을 내지 않도록 판정 로직을 여기 한 곳에만 둔다.

// 상품의 기간별 금리 옵션 중 사용자 목표 기간에 실제로 적용할 옵션을 고른다.
// 반환한 months와 rate는 항상 같은 옵션에서 나오므로, 만기 계산 시 기간과 금리가 어긋날 수 없다.
//
// - 옵션이 있는 상품(finlife): 목표 기간과 상품 최대기간 중 짧은 쪽 이하에서 "가장 긴" 기간의 옵션을 쓰고,
//   같은 기간에 옵션이 여러 개면 그중 최고금리를 쓴다.
// - 옵션이 없는 상품(manual 정책 상품): base_rate를 상품 최대기간까지의 목표 기간에 그대로 적용한다.
// - 목표 기간이 상품의 최단 옵션보다도 짧으면 적용할 금리가 없으므로 null(대상 제외).
function pickTerm(product, periodMonths) {
  const maxPeriod = Number(product.max_period);
  const cappedPeriod = Number.isFinite(maxPeriod) ? Math.min(periodMonths, maxPeriod) : periodMonths;
  if (!(cappedPeriod > 0)) return null;

  const options = Array.isArray(product.options) ? product.options : [];
  if (options.length === 0) {
    const rate = Number(product.base_rate);
    return Number.isFinite(rate) ? { months: cappedPeriod, rate } : null;
  }

  const applicable = options.filter(o => o.term <= cappedPeriod);
  if (applicable.length === 0) return null;

  const months = Math.max(...applicable.map(o => o.term));
  const rate = Math.max(...applicable.filter(o => o.term === months).map(o => o.rate));
  return { months, rate };
}

// 개별 자격 조건. income_limit/monthly_limit은 "제한 없음"을 null로 표현하는 컨벤션이라
// undefined까지 함께 걸러내기 위해 == null로 비교한다.
const meetsAge = (product, age) => age >= product.min_age && age <= product.max_age;

// 목표 기간이 상품 최소기간 이상이기만 하면 된다. 목표 기간이 상품 최대기간보다 길어도
// pickTerm이 상품 최대기간으로 잘라서 운용하므로 자격 자체를 떨어뜨리지는 않는다.
const meetsPeriod = (product, periodMonths) => periodMonths >= product.min_period;

const meetsIncome = (product, personalIncome) =>
  product.income_limit == null || personalIncome <= product.income_limit;

const meetsMonthlyLimit = (product, monthlyAmount) =>
  product.monthly_limit == null || monthlyAmount <= product.monthly_limit;

// ─────────────────────────────────────────────
// 가입 제한 (금감원 join_deny: 1=제한없음, 2=서민전용, 3=일부제한)
// ─────────────────────────────────────────────

// 반려동물 등록·자녀 보유처럼 특정 조건을 요구하는 상품은 청년 일반 사용자가
// 가입할 수 없는데도 금리가 높아 추천 상위를 차지한다. 목록·추천에서 제외한다.
// 데이터는 지우지 않으므로, 조건을 판정할 프로필 정보가 생기면 되살릴 수 있다.
//
// join_deny가 NULL인 경우는 두 가지이며 둘 다 노출한다.
//   ① 정책 상품(manual) — 금감원 데이터가 아니라 이 필드 자체가 없다
//   ② 아직 재동기화하지 않은 기존 finlife 행 — 값이 채워지기 전까지 기존 동작을 유지
const JOIN_DENY_NONE = 1;

// join_deny=3(일부제한)에는 성격이 전혀 다른 조건들이 섞여 있다.
// "반려견을 키우는 고객"처럼 청년이 충족할 수 없는 것도 있지만,
// "만19세~만34세 개인"(NH1934월복리적금)처럼 오히려 청년 전용인 상품도 여기 들어간다.
// 그래서 join_deny만으로 자르면 청년 대상 적금까지 함께 사라진다.
// 실제 가입대상 문구(join_member)를 보고 "청년 개인이 가입할 수 있는가"로 판정한다.

// 본인이 아닌 부양 대상에 걸린 조건. 청년 개인 혼자서는 충족할 수 없다.
const DEPENDENT_CONDITION = /반려|애견|자녀|어린이|미성년|청소년|출산|임신|한부모|다자녀|유아/;

// 연령 상한이 19세 미만이면 청년은 가입 대상이 아니다.
// "39세 이하"(청년플랜적금)처럼 상한이 높은 경우와 구분해야 하므로 숫자를 실제로 비교한다.
// "19세 미만"은 상한이 18세라는 뜻이므로 1을 빼서 판정한다.
function hasUnderageCeiling(text) {
  const pattern = /(\d{1,2})\s*세\s*(이하|미만)/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const ceiling = match[2] === '미만' ? Number(match[1]) - 1 : Number(match[1]);
    if (ceiling < 19) return true;
  }
  return false;
}

// 청년 개인이 가입할 수 있는 상품인가.
//   ① join_deny가 없거나(정책 상품) 1(제한없음)이면 통과
//   ② 제한이 있어도 가입대상 문구가 부양 대상·미성년 조건이 아니면 통과
function isYouthJoinable(product) {
  if (product.join_deny == null || Number(product.join_deny) === JOIN_DENY_NONE) return true;

  const text = `${product.join_member ?? ''} ${product.special_note ?? ''}`;
  if (!text.trim()) return false; // 조건이 있다고만 하고 내용이 없으면 보수적으로 제외
  return !DEPENDENT_CONDITION.test(text) && !hasUnderageCeiling(text);
}

// 나이·기간·소득만 보는 기본 자격. 월 납입 한도는 포함하지 않는다.
// 배분(allocate)은 한 상품의 한도를 넘는 금액을 다음 상품으로 넘기는 것이 목적이라
// 월 한도를 자격 조건으로 쓰면 안 되기 때문이다. 추천(recommend)은 여기에 월 한도 조건을 더해서 쓴다.
function meetsBaseEligibility(product, { age, period_months, personal_income }) {
  return (
    meetsAge(product, age) &&
    meetsPeriod(product, period_months) &&
    meetsIncome(product, personal_income)
  );
}

module.exports = {
  pickTerm,
  meetsAge,
  meetsPeriod,
  meetsIncome,
  meetsMonthlyLimit,
  meetsBaseEligibility,
  isYouthJoinable,
  hasUnderageCeiling,
};
