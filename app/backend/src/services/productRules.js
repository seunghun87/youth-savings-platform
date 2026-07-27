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
};
